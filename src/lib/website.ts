import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";
import Anthropic from "@anthropic-ai/sdk";
import { env, integrationModes } from "@/lib/env";
import { log } from "@/lib/logger";
import { ServiceError } from "@/lib/services/context";

// Fetch a user-supplied business website safely (SSRF-guarded) and extract
// business details. Results are suggestions the user reviews before saving.

export interface BusinessDetails {
  business_name: string | null;
  business_description: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  business_website: string;
}

const MAX_BYTES = 1_000_000;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new ServiceError("That doesn't look like a website address.", 422, "bad_url");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new ServiceError("Only http and https websites are supported.", 422, "bad_url");
  if (url.username || url.password) throw new ServiceError("Website addresses with credentials aren't allowed.", 422, "bad_url");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new ServiceError("Use a public website address.", 422, "private_url");
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new ServiceError("That website couldn't be found.", 422, "dns_failed");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new ServiceError("Use a public website address.", 422, "private_url");
  return url;
}

async function fetchHtml(start: URL): Promise<{ html: string; finalUrl: URL }> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "COLLECTIQ-BusinessProfile/1.0", Accept: "text/html,application/xhtml+xml" },
    }).catch(() => null);
    if (!res) throw new ServiceError("The website didn't respond in time.", 502, "fetch_failed");
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok) throw new ServiceError(`The website returned ${res.status}.`, 502, "fetch_failed");
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) throw new ServiceError("That address isn't a web page.", 422, "not_html");
    const reader = res.body?.getReader();
    if (!reader) return { html: "", finalUrl: url };
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
    void reader.cancel().catch(() => {});
    return { html: new TextDecoder().decode(Buffer.concat(chunks)), finalUrl: url };
  }
  throw new ServiceError("The website redirected too many times.", 502, "fetch_failed");
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ");

function meta(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, "i");
  const m = re.exec(html);
  const v = m?.[1] ?? m?.[2];
  return v ? decode(v).trim() || null : null;
}

/** Deterministic extraction from HTML: meta tags, schema.org JSON-LD, mailto/tel links. */
export function extractFromHtml(html: string, url: string): BusinessDetails & { text: string } {
  const out: BusinessDetails = {
    business_name: meta(html, "og:site_name"),
    business_description: meta(html, "description") ?? meta(html, "og:description"),
    business_email: null,
    business_phone: null,
    business_address: null,
    business_website: url,
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const items = (Array.isArray(data) ? data : data["@graph"] ?? [data]) as Array<Record<string, unknown>>;
      const org = items.find((x) => /Organization|LocalBusiness|ProfessionalService|Corporation|Person/i.test(String(x["@type"] ?? "")));
      if (org) {
        out.business_name ??= typeof org.name === "string" ? org.name : null;
        out.business_description ??= typeof org.description === "string" ? org.description : null;
        out.business_email ??= typeof org.email === "string" ? org.email.replace(/^mailto:/i, "") : null;
        out.business_phone ??= typeof org.telephone === "string" ? org.telephone : null;
        const a = org.address as Record<string, string> | string | undefined;
        if (a && !out.business_address) {
          out.business_address = typeof a === "string" ? a : [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry].filter(Boolean).join(", ") || null;
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  out.business_email ??= /mailto:([^"'?\s>]+@[^"'?\s>]+)/i.exec(html)?.[1] ?? null;
  out.business_phone ??= /href=["']tel:([^"']+)["']/i.exec(html)?.[1]?.trim() ?? null;
  if (!out.business_name) {
    const t = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1];
    out.business_name = t ? decode(t).split(/[|\-–—:]/)[0].trim() || null : null;
  }
  const text = decode(
    html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
  return { ...out, text };
}

async function refineWithClaude(base: BusinessDetails & { text: string }): Promise<BusinessDetails | null> {
  try {
    const client = new Anthropic({ apiKey: env.anthropic.apiKey });
    const res = await client.messages.create({
      model: env.anthropic.model,
      max_tokens: 600,
      system:
        "Extract a business profile from website content. Use ONLY information present in the content; use null for anything not stated. Never guess emails, phones or addresses. Reply with a single JSON object with keys business_name, business_description (one or two sentences describing what the business does), business_email, business_phone, business_address. No prose.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            url: base.business_website,
            detected: { name: base.business_name, description: base.business_description, email: base.business_email, phone: base.business_phone, address: base.business_address },
            page_text: base.text,
          }),
        },
      ],
    });
    const raw = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Partial<BusinessDetails>;
    const pick = (k: keyof BusinessDetails, max: number) => (typeof json[k] === "string" && json[k] ? String(json[k]).slice(0, max) : null);
    return {
      business_name: pick("business_name", 120) ?? base.business_name,
      business_description: pick("business_description", 1000) ?? base.business_description,
      // Contact details must literally appear on the page; otherwise keep the deterministic value.
      business_email: [pick("business_email", 200)].find((e) => e && base.text.includes(e)) ?? base.business_email,
      business_phone: pick("business_phone", 60) ?? base.business_phone,
      business_address: pick("business_address", 300) ?? base.business_address,
      business_website: base.business_website,
    };
  } catch (e) {
    log.warn("website.claude_failed", { error: (e as Error).message });
    return null;
  }
}

export async function extractBusinessDetails(rawUrl: string): Promise<{ details: BusinessDetails; engine: "claude" | "rules" }> {
  const url = await assertPublicUrl(rawUrl.trim());
  const { html, finalUrl } = await fetchHtml(url);
  const base = extractFromHtml(html, finalUrl.origin + (finalUrl.pathname === "/" ? "" : finalUrl.pathname));
  if (integrationModes().ai === "claude" && base.text.length > 40) {
    const refined = await refineWithClaude(base);
    if (refined) return { details: refined, engine: "claude" };
  }
  const { text: _t, ...details } = base;
  void _t;
  return { details, engine: "rules" };
}
