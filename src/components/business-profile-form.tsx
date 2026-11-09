"use client";

import { Globe, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Field, Input, Textarea } from "@/components/ui/primitives";
import { apiFetch, useApi } from "@/components/use-api";
import type { Profile } from "@/lib/types";

type Details = {
  business_name: string;
  business_description: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  business_website: string;
};

export function BusinessProfileForm({ profile }: { profile: Profile }) {
  const [url, setUrl] = useState(profile.business_website ?? "");
  const [f, setF] = useState<Details>({
    business_name: profile.business_name ?? "",
    business_description: profile.business_description ?? "",
    business_email: profile.business_email ?? "",
    business_phone: profile.business_phone ?? "",
    business_address: profile.business_address ?? "",
    business_website: profile.business_website ?? "",
  });
  const [extracting, setExtracting] = useState(false);
  const [source, setSource] = useState<null | "claude" | "rules">(null);
  const { run, pending } = useApi();

  const extract = async () => {
    if (!url.trim()) return;
    setExtracting(true);
    try {
      const r = await apiFetch<{ details: Record<keyof Details, string | null>; engine: "claude" | "rules" }>("/api/business/extract", { url });
      // Only fill fields the website actually provided; keep what the user typed otherwise.
      setF((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(prev) as Array<keyof Details>) if (r.details[k]) next[k] = String(r.details[k]);
        return next;
      });
      setSource(r.engine);
      const found = Object.values(r.details).filter(Boolean).length - 1;
      toast.success(found > 0 ? "Details found. Review them, then save." : "The website had little business information. Fill in the rest manually.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that website");
    } finally {
      setExtracting(false);
    }
  };

  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="grid gap-3">
      <div className="rounded-[12px] border border-dashed border-primary/40 bg-primary-soft/30 p-3">
        <label htmlFor="biz-url" className="flex items-center gap-1.5 text-xs font-medium">
          <Sparkles className="size-3.5 text-primary" /> Fill from your website
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="biz-url" className="pl-9" placeholder="yourstudio.com" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), extract())} />
          </div>
          <Button type="button" onClick={extract} disabled={extracting || !url.trim()}>
            {extracting ? "Reading website…" : "Extract details"}
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          COLLECTIQ reads the public page and suggests details. Nothing is saved until you click Save.
          {source && <Badge tone={source === "claude" ? "primary" : "neutral"} className="ml-2">{source === "claude" ? "Extracted with Claude" : "Extracted from page tags"}</Badge>}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Business name" htmlFor="bn2">
          <Input id="bn2" value={f.business_name} onChange={set("business_name")} maxLength={120} />
        </Field>
        <Field label="Website" htmlFor="bw">
          <Input id="bw" value={f.business_website} onChange={set("business_website")} maxLength={300} />
        </Field>
        <Field label="Business email" htmlFor="be">
          <Input id="be" type="email" value={f.business_email} onChange={set("business_email")} />
        </Field>
        <Field label="Phone" htmlFor="bp">
          <Input id="bp" value={f.business_phone} onChange={set("business_phone")} maxLength={60} />
        </Field>
        <Field label="Address" htmlFor="ba" className="sm:col-span-2">
          <Input id="ba" value={f.business_address} onChange={set("business_address")} maxLength={300} />
        </Field>
        <Field label="What your business does" htmlFor="bd" className="sm:col-span-2">
          <Textarea id="bd" value={f.business_description} onChange={set("business_description")} maxLength={1000} />
        </Field>
      </div>
      <div>
        <Button onClick={() => run("save", "/api/settings", f, { method: "PATCH", success: "Business details saved" })} disabled={pending !== null}>
          {pending ? "Saving…" : "Save business details"}
        </Button>
      </div>
    </div>
  );
}
