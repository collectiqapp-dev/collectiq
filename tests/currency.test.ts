import { describe, expect, it } from "vitest";
import { executeTool } from "@/lib/agent/tools";
import { removeDemoData, seedDemoData } from "@/lib/db/seed";
import { formatMoney } from "@/lib/money";
import { createInvoiceDraft, paypalInvoiceCurrencyAllowed, sendInvoice } from "@/lib/services/invoices";
import { NOW, makeCtx } from "./helpers";

describe("INR support", () => {
  it("formats INR with Indian digit grouping", () => {
    expect(formatMoney(12_000_000, "INR")).toBe("₹1,20,000.00");
    expect(formatMoney(150_000, "USD")).toBe("$1,500.00");
  });

  it("loads demo data in the reporting currency and can reload it after a currency change", async () => {
    const env = await makeCtx();
    await seedDemoData(env.db, NOW, "USD");
    expect((await env.db.list("invoices", { is_demo: true }))[0].currency).toBe("USD");

    await env.db.updateProfile({ default_currency: "INR" });
    await removeDemoData(env.db);
    await seedDemoData(env.db, NOW);
    const demo = await env.db.list("invoices", { is_demo: true });
    expect(demo.every((i) => i.currency === "INR")).toBe(true);
    expect(demo.find((i) => i.invoice_number === "DEMO-1001")?.total_cents).toBe(150_000 * 80); // $1,500 → ₹1,20,000
    expect((await env.db.list("clients", { is_demo: true })).every((c) => c.currency === "INR")).toBe(true);
    // The real (non-demo) client from the test setup is untouched.
    expect(await env.db.get("clients", env.client.id)).not.toBeNull();
  });

  it("never calls PayPal for INR invoices and explains why (PayPal rejects INR for this account)", async () => {
    expect(paypalInvoiceCurrencyAllowed("INR")).toBe(false);
    expect(paypalInvoiceCurrencyAllowed("USD")).toBe(true);
    const env = await makeCtx();
    const c = await env.db.insert("clients", {
      name: "Asha Rao", email: "asha@example.com", company: null, phone: null, currency: "INR",
      collection_paused: false, dispute_open: false, dispute_note: null, notes: null, is_demo: false,
    });
    const draft = await createInvoiceDraft(env.ctx, {
      client_id: c.id, currency: "INR", issue_date: "2026-11-10", due_date: "2026-11-17",
      items: [{ description: "Logo", quantity: 1, unit_amount: 20000 }],
    });
    await expect(sendInvoice(env.ctx, draft.id, { actor: "user" })).rejects.toMatchObject({ code: "currency_not_supported_by_paypal" });
    expect(env.paypal.calls).toHaveLength(0);
    expect((await env.db.require("invoices", draft.id)).status).toBe("draft");
    const tool = await executeTool(env.ctx, "send_invoice", { invoice_id: draft.id });
    expect(String(tool.result.error)).toMatch(/can't invoice in INR/);
  });
});
