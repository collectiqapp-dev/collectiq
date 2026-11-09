import { describe, expect, it } from "vitest";
import { executeTool } from "@/lib/agent/tools";
import { reportingCurrency } from "@/lib/metrics";
import { makeCtx, sentInvoice } from "./helpers";

describe("reporting currency", () => {
  it("uses the preferred currency when invoices exist in it, otherwise the dominant one", () => {
    expect(reportingCurrency([], "INR")).toBe("INR");
    expect(reportingCurrency([{ currency: "USD" }, { currency: "INR" }], "INR")).toBe("INR");
    expect(reportingCurrency([{ currency: "USD" }, { currency: "USD" }, { currency: "EUR" }], "INR")).toBe("USD");
  });

  it("the AI summary tool reports the invoices' currency and explains the mismatch instead of returning zeros", async () => {
    const env = await makeCtx();
    await sentInvoice(env, { due: "2026-11-20", amount: 650 });
    await env.db.updateProfile({ default_currency: "INR" });
    const out = await executeTool(env.ctx, "get_collection_summary", {});
    expect(out.result.currency).toBe("USD");
    expect(out.result.outstanding).toBe("$650.00");
    expect(String(out.result.currency_note)).toMatch(/no INR invoices/);
  });
});
