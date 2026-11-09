import { addDays, todayISO } from "@/lib/dates";
import { importRowSchema } from "@/lib/import";
import { toCents } from "@/lib/money";
import type { Client, Currency, InvoiceStatus } from "@/lib/types";
import { type ServiceContext, ServiceError, recordActivity } from "./context";

export interface ImportResult {
  clientsCreated: number;
  clientsMatched: number;
  invoicesCreated: number;
  skipped: Array<{ line: number; reason: string }>;
}

/**
 * Import clients and invoices from spreadsheet rows. Every row is re-validated
 * here. Clients are matched by email. Imported non-draft invoices are recorded
 * as issued outside COLLECTIQ: they have no PayPal invoice, so the autopilot
 * will not send PayPal reminders for them.
 */
export async function importRows(ctx: ServiceContext, rows: Array<{ line: number; data: unknown }>): Promise<ImportResult> {
  if (!Array.isArray(rows) || rows.length === 0) throw new ServiceError("The file has no rows to import.", 422, "validation");
  if (rows.length > 1000) throw new ServiceError("Import at most 1,000 rows at a time.", 422, "too_many_rows");

  const result: ImportResult = { clientsCreated: 0, clientsMatched: 0, invoicesCreated: 0, skipped: [] };
  const clients = new Map<string, Client>((await ctx.db.list("clients")).map((c) => [c.email.toLowerCase(), c]));
  const numbers = new Set((await ctx.db.list("invoices")).map((i) => i.invoice_number.toLowerCase()));
  const policy = await ctx.db.findOne("collection_policies", { is_default: true });
  const profile = await ctx.db.profile();
  const today = todayISO(ctx.now());
  const matched = new Set<string>();

  for (const { line, data } of rows) {
    const parsed = importRowSchema.safeParse(data);
    if (!parsed.success) {
      result.skipped.push({ line, reason: parsed.error.issues.map((i) => i.message).join("; ") });
      continue;
    }
    const r = parsed.data;
    const key = r.client_email.toLowerCase();
    let client = clients.get(key);
    if (!client) {
      client = await ctx.db.insert("clients", {
        name: r.client_name,
        email: r.client_email,
        company: r.company ?? null,
        phone: r.phone ?? null,
        currency: r.currency as Currency,
        collection_paused: false,
        dispute_open: false,
        dispute_note: null,
        notes: "Imported from spreadsheet.",
        is_demo: false,
      });
      clients.set(key, client);
      matched.add(key); // created in this import: not an "existing client" match
      result.clientsCreated++;
    } else if (!matched.has(key)) {
      matched.add(key);
      result.clientsMatched++;
    }

    if (r.unit_amount == null || !r.description) continue; // client-only row

    const number = r.invoice_number ?? `IMP-${today.replace(/-/g, "").slice(2)}-${String(result.invoicesCreated + 1).padStart(3, "0")}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    if (numbers.has(number.toLowerCase())) {
      result.skipped.push({ line, reason: `Invoice number ${number} already exists` });
      continue;
    }
    numbers.add(number.toLowerCase());

    let projectId: string | null = null;
    if (r.project) {
      const existing = (await ctx.db.list("projects", { client_id: client.id })).find((p) => p.name.toLowerCase() === r.project!.toLowerCase());
      projectId = existing?.id ?? (await ctx.db.insert("projects", { client_id: client.id, name: r.project, status: "active", is_demo: false })).id;
    }

    const subtotal = Math.round(r.quantity * toCents(r.unit_amount));
    const tax = Math.round((subtotal * profile.tax_rate_percent) / 100);
    const total = subtotal + tax;
    const status: InvoiceStatus = r.status;
    const paid = status === "paid" ? total : status === "partially_paid" ? Math.min(toCents(r.amount_paid ?? 0), total) : 0;
    const issue = r.issue_date ?? today;
    const due = r.due_date ?? addDays(issue, 14);

    const invoice = await ctx.db.insert("invoices", {
      client_id: client.id,
      project_id: projectId,
      policy_id: policy?.id ?? null,
      invoice_number: number,
      currency: r.currency as Currency,
      issue_date: issue,
      due_date: due < issue ? issue : due,
      status,
      subtotal_cents: subtotal,
      tax_cents: tax,
      total_cents: total,
      amount_paid_cents: paid,
      amount_due_cents: total - paid,
      note: status === "draft" ? null : "Imported: issued outside COLLECTIQ (no PayPal invoice).",
      collection_paused: false,
      dispute_open: false,
      paypal_mode: null,
      paypal_invoice_id: null,
      paypal_status: null,
      paypal_recipient_url: null,
      paypal_invoicer_url: null,
      paypal_last_synced_at: null,
      sent_at: status === "draft" ? null : `${issue}T12:00:00.000Z`,
      paid_at: status === "paid" ? `${due}T12:00:00.000Z` : null,
      cancelled_at: null,
      is_demo: false,
      created_by: "user",
    });
    await ctx.db.insert("invoice_items", {
      invoice_id: invoice.id,
      description: r.description,
      quantity: r.quantity,
      unit_amount_cents: toCents(r.unit_amount),
      position: 0,
    });
    result.invoicesCreated++;
  }

  await recordActivity(ctx, {
    category: "invoice_created",
    trigger: "Spreadsheet import",
    proposed_action: `Imported ${result.clientsCreated} new client(s) and ${result.invoicesCreated} invoice(s); ${result.skipped.length} row(s) skipped`,
    reasoning: "Non-draft invoices were issued outside COLLECTIQ, so they have no PayPal invoice and are excluded from PayPal reminders.",
    execution_status: "succeeded",
  });
  return result;
}
