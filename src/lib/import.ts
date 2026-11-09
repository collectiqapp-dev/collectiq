import { z } from "zod";
import { CURRENCIES } from "@/lib/types";

// Spreadsheet import: one row per invoice (or per client, if the invoice
// columns are left empty). Shared by the browser preview and the server, which
// re-validates everything before writing.

export const IMPORT_COLUMNS = [
  "client_name",
  "client_email",
  "company",
  "phone",
  "currency",
  "invoice_number",
  "project",
  "description",
  "quantity",
  "unit_amount",
  "issue_date",
  "due_date",
  "status",
  "amount_paid",
] as const;

const ALIASES: Record<string, (typeof IMPORT_COLUMNS)[number]> = {
  name: "client_name",
  client: "client_name",
  customer: "client_name",
  customer_name: "client_name",
  email: "client_email",
  customer_email: "client_email",
  company_name: "company",
  telephone: "phone",
  phone_number: "phone",
  invoice: "invoice_number",
  invoice_no: "invoice_number",
  number: "invoice_number",
  item: "description",
  service: "description",
  work: "description",
  qty: "quantity",
  amount: "unit_amount",
  price: "unit_amount",
  rate: "unit_amount",
  total: "unit_amount",
  issued: "issue_date",
  date: "issue_date",
  invoice_date: "issue_date",
  due: "due_date",
  paid: "amount_paid",
};

export function normalizeHeader(h: unknown): string {
  const k = String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return (IMPORT_COLUMNS as readonly string[]).includes(k) ? k : (ALIASES[k] ?? k);
}

/** Excel serial date (days since 1899-12-30) → YYYY-MM-DD. */
function excelSerialToISO(n: number): string {
  return new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86_400_000).toISOString().slice(0, 10);
}

export function toISODate(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString().slice(0, 10);
  if (typeof v === "number") return v > 20000 && v < 80000 ? excelSerialToISO(v) : undefined;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (dmy) {
    // Ambiguous d/m vs m/d: treat as day/month when the first part > 12, else month/day.
    const [a, b, y] = [Number(dmy[1]), Number(dmy[2]), dmy[3]];
    const [m, d] = a > 12 ? [b, a] : [a, b];
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

const num = (v: unknown) => {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};
const str = (v: unknown) => {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? undefined : s;
};

export const importRowSchema = z
  .object({
    client_name: z.string().trim().min(1, "client_name is required").max(120),
    client_email: z.email("client_email must be a valid email"),
    company: z.string().max(120).optional(),
    phone: z.string().max(40).optional(),
    currency: z.enum(CURRENCIES as [string, ...string[]], { message: `currency must be one of ${CURRENCIES.join(", ")}` }).default("USD"),
    invoice_number: z.string().max(40).optional(),
    project: z.string().max(120).optional(),
    description: z.string().max(200).optional(),
    quantity: z.number().positive().max(10_000).default(1),
    unit_amount: z.number().positive("unit_amount must be greater than zero").max(1_000_000).optional(),
    issue_date: z.iso.date().optional(),
    due_date: z.iso.date().optional(),
    status: z.enum(["draft", "sent", "paid", "partially_paid"]).default("draft"),
    amount_paid: z.number().min(0).max(1_000_000).optional(),
  })
  .superRefine((r, ctx) => {
    const hasInvoice = r.description || r.unit_amount != null;
    if (!hasInvoice) return;
    if (!r.description) ctx.addIssue({ code: "custom", path: ["description"], message: "description is required for an invoice row" });
    if (r.unit_amount == null) ctx.addIssue({ code: "custom", path: ["unit_amount"], message: "unit_amount is required for an invoice row" });
    if (r.issue_date && r.due_date && r.due_date < r.issue_date) ctx.addIssue({ code: "custom", path: ["due_date"], message: "due_date is before issue_date" });
    if (r.status === "partially_paid" && !r.amount_paid) ctx.addIssue({ code: "custom", path: ["amount_paid"], message: "amount_paid is required for partially_paid" });
  });
export type ImportRow = z.infer<typeof importRowSchema>;

export interface ParsedImport {
  rows: Array<{ line: number; data?: ImportRow; errors: string[] }>;
  unknownColumns: string[];
}

/** Map raw sheet rows (first row = headers) into validated import rows. */
export function parseImportTable(table: unknown[][]): ParsedImport {
  const [header = [], ...body] = table;
  const keys = header.map(normalizeHeader);
  const unknownColumns = keys.filter((k) => k && !(IMPORT_COLUMNS as readonly string[]).includes(k));
  const rows: ParsedImport["rows"] = [];
  body.forEach((cells, i) => {
    if (!cells || cells.every((c) => c == null || String(c).trim() === "")) return;
    const raw: Record<string, unknown> = {};
    keys.forEach((k, j) => {
      if (k) raw[k] = cells[j];
    });
    const candidate = {
      client_name: str(raw.client_name),
      client_email: str(raw.client_email),
      company: str(raw.company),
      phone: str(raw.phone),
      currency: str(raw.currency)?.toUpperCase(),
      invoice_number: str(raw.invoice_number),
      project: str(raw.project),
      description: str(raw.description),
      quantity: num(raw.quantity),
      unit_amount: num(raw.unit_amount),
      issue_date: toISODate(raw.issue_date),
      due_date: toISODate(raw.due_date),
      status: str(raw.status)?.toLowerCase().replace(/\s+/g, "_"),
      amount_paid: num(raw.amount_paid),
    };
    const parsed = importRowSchema.safeParse(candidate);
    rows.push(
      parsed.success
        ? { line: i + 2, data: parsed.data, errors: [] }
        : { line: i + 2, errors: parsed.error.issues.map((x) => x.message) },
    );
  });
  return { rows, unknownColumns };
}

export const TEMPLATE_CSV = [
  IMPORT_COLUMNS.join(","),
  "Sarah Chen,sarah@bloomstudio.example,Bloom Studio,,USD,INV-2001,Brand refresh,Logo and guidelines,1,1500,2026-10-01,2026-10-15,sent,",
  "Alex Rivera,alex@northwind.example,Northwind Labs,,USD,INV-2002,Dashboard redesign,UX audit,1,900,2026-10-20,2026-11-03,partially_paid,400",
  "Maya Patel,maya@lumen.example,Lumen Coffee,+1 628 555 0199,USD,,,,,,,,,",
].join("\n");
