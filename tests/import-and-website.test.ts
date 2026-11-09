import { describe, expect, it } from "vitest";
import { runCollectionCycle } from "@/lib/agent/scheduler";
import { normalizeHeader, parseImportTable, toISODate } from "@/lib/import";
import { importRows } from "@/lib/services/import";
import { assertPublicUrl, extractFromHtml } from "@/lib/website";
import { makeCtx } from "./helpers";

describe("spreadsheet import parsing", () => {
  it("maps common header names and parses dates and amounts", () => {
    expect(normalizeHeader("Email")).toBe("client_email");
    expect(normalizeHeader("Invoice No")).toBe("invoice_number");
    expect(normalizeHeader(" Amount ")).toBe("unit_amount");
    expect(toISODate("2026-10-01")).toBe("2026-10-01");
    expect(toISODate("25/10/2026")).toBe("2026-10-25");
    expect(toISODate(46296)).toBe("2026-10-01"); // Excel serial date
    expect(toISODate(new Date("2026-10-01T00:00:00Z"))).toBe("2026-10-01");

    const r = parseImportTable([
      ["Name", "Email", "Description", "Amount", "Due", "Status", "Favourite colour"],
      ["Sarah Chen", "sarah@example.com", "Logo", "$1,500.00", "2026-11-20", "Sent", "green"],
      ["No Email", "", "Logo", "100", "", "", ""],
      ["Maya Patel", "maya@example.com", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
    ]);
    expect(r.unknownColumns).toEqual(["favourite_colour"]);
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0].data).toMatchObject({ client_name: "Sarah Chen", unit_amount: 1500, status: "sent", due_date: "2026-11-20", quantity: 1, currency: "USD" });
    expect(r.rows[1].errors.join()).toMatch(/client_email/);
    expect(r.rows[2].data?.unit_amount).toBeUndefined(); // client-only row
  });

  it("rejects inconsistent invoice rows", () => {
    const r = parseImportTable([
      ["client_name", "client_email", "description", "unit_amount", "issue_date", "due_date", "status", "currency"],
      ["A", "a@example.com", "Work", "100", "2026-10-10", "2026-10-01", "draft", "USD"],
      ["B", "b@example.com", "Work", "", "", "", "", "USD"],
      ["C", "c@example.com", "Work", "50", "", "", "partially_paid", "USD"],
      ["D", "d@example.com", "Work", "50", "", "", "", "BTC"],
    ]);
    expect(r.rows.map((x) => x.errors.length > 0)).toEqual([true, true, true, true]);
  });
});

describe("import service", () => {
  it("creates clients and invoices, matches existing clients by email and skips duplicates", async () => {
    const env = await makeCtx();
    const { rows } = parseImportTable([
      ["client_name", "client_email", "invoice_number", "description", "unit_amount", "issue_date", "due_date", "status", "amount_paid"],
      ["Sarah Chen", "SARAH@example.com", "INV-1", "Logo", "1500", "2026-10-01", "2026-10-15", "sent", ""],
      ["Alex Rivera", "alex@example.com", "INV-2", "Audit", "900", "2026-10-20", "2026-11-03", "partially_paid", "400"],
      ["Alex Rivera", "alex@example.com", "INV-2", "Audit again", "900", "", "", "draft", ""],
      ["Maya Patel", "maya@example.com", "", "", "", "", "", "", ""],
    ]);
    const res = await importRows(env.ctx, rows.map((r) => ({ line: r.line, data: r.data as unknown })));
    expect(res).toMatchObject({ clientsCreated: 2, clientsMatched: 1, invoicesCreated: 2 }); // Sarah already existed
    expect(res.skipped.map((s) => s.reason).join()).toMatch(/INV-2 already exists/);
    const alex = (await env.db.list("invoices")).find((i) => i.invoice_number === "INV-2")!;
    expect(alex).toMatchObject({ status: "partially_paid", total_cents: 90000, amount_paid_cents: 40000, amount_due_cents: 50000, paypal_invoice_id: null });

    // Imported invoices have no PayPal invoice, so autopilot never tries PayPal reminders for them.
    const cycle = await runCollectionCycle(env.ctx);
    expect(cycle.executed + cycle.approvalsRequested + cycle.failed).toBe(0);
    expect(env.paypal.count("remind")).toBe(0);
  });

  it("re-validates rows on the server", async () => {
    const env = await makeCtx();
    const res = await importRows(env.ctx, [{ line: 2, data: { client_name: "X", client_email: "not-an-email" } }]);
    expect(res.clientsCreated).toBe(0);
    expect(res.skipped).toHaveLength(1);
  });
});

describe("business website extraction", () => {
  it("reads meta tags, JSON-LD and contact links without inventing data", () => {
    const html = `<html><head><title>Bloom Studio | Brand design</title>
      <meta name="description" content="Brand identity &amp; packaging design for food businesses.">
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"ProfessionalService","name":"Bloom Studio","telephone":"+1 415 555 0142","address":{"streetAddress":"12 Market St","addressLocality":"San Francisco","addressRegion":"CA"}}</script>
      </head><body><a href="mailto:hello@bloomstudio.example">Email us</a><script>var x=1</script><p>We design brands.</p></body></html>`;
    const d = extractFromHtml(html, "https://bloomstudio.example");
    expect(d).toMatchObject({
      business_name: "Bloom Studio",
      business_description: "Brand identity & packaging design for food businesses.",
      business_email: "hello@bloomstudio.example",
      business_phone: "+1 415 555 0142",
      business_address: "12 Market St, San Francisco, CA",
    });
    expect(d.text).toContain("We design brands.");
    expect(d.text).not.toContain("var x");

    const empty = extractFromHtml("<html><body>Hi</body></html>", "https://x.example");
    expect([empty.business_email, empty.business_phone, empty.business_address]).toEqual([null, null, null]);
  });

  it("refuses private, local and non-http addresses (SSRF protection)", async () => {
    for (const bad of ["http://localhost:3000", "http://127.0.0.1", "http://10.0.0.5", "http://192.168.1.1", "http://169.254.169.254/latest/meta-data", "ftp://example.com", "http://[::1]/"]) {
      await expect(assertPublicUrl(bad)).rejects.toBeTruthy();
    }
  });
});
