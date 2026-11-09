"use client";

import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/primitives";
import { apiFetch } from "@/components/use-api";
import { type ParsedImport, parseImportTable } from "@/lib/import";

async function readTable(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(file)) as unknown[][];
  }
  if (name.endsWith(".csv") || file.type === "text/csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const out = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    return out.data;
  }
  throw new Error("Use a .csv or .xlsx file. (Older .xls files: open them in Excel and save as .xlsx.)");
}

export function ImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = parsed?.rows.filter((r) => r.data) ?? [];
  const invalid = parsed?.rows.filter((r) => !r.data) ?? [];
  const invoiceCount = valid.filter((r) => r.data?.unit_amount != null).length;

  const onFile = async (file: File | undefined) => {
    setParsed(null);
    setError(null);
    if (!file) return;
    if (file.size > 5_000_000) return setError("File is larger than 5 MB.");
    setFileName(file.name);
    try {
      const table = await readTable(file);
      const result = parseImportTable(table);
      if (result.rows.length === 0) setError("No data rows found. The first row must be the column headers.");
      setParsed(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file.");
    }
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const r = await apiFetch<{ clientsCreated: number; clientsMatched: number; invoicesCreated: number; skipped: Array<{ line: number; reason: string }> }>("/api/import", {
        rows: valid.map((v) => ({ line: v.line, data: v.data })),
      });
      toast.success(`Imported ${r.clientsCreated} new client(s) and ${r.invoicesCreated} invoice(s)${r.skipped.length ? `; ${r.skipped.length} row(s) skipped` : ""}.`);
      setOpen(false);
      setParsed(null);
      setFileName(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileSpreadsheet /> Import from Excel / CSV
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-2xl"
        title="Import clients and invoices"
        description="Upload a .csv or .xlsx file with one row per invoice. Rows without an amount just add the client. You'll see a preview before anything is saved."
      >
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-input px-3 py-2 text-sm hover:border-primary">
              <Upload className="size-4" />
              {fileName ?? "Choose file"}
              <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <a href="/collectiq-import-template.csv" download className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Download className="size-3.5" /> Download template
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Columns: <code>client_name</code>, <code>client_email</code> (required), <code>company</code>, <code>phone</code>, <code>currency</code>, <code>invoice_number</code>, <code>project</code>, <code>description</code>, <code>quantity</code>, <code>unit_amount</code>, <code>issue_date</code>, <code>due_date</code>, <code>status</code> (draft, sent, paid, partially_paid), <code>amount_paid</code>. Common names like &quot;Email&quot; or &quot;Amount&quot; are recognised.
          </p>
          <p className="rounded-[10px] bg-muted px-3 py-2 text-xs text-muted-foreground">
            Imported sent or paid invoices are recorded as issued outside COLLECTIQ. They count in your dashboards but have no PayPal invoice, so no PayPal reminders are sent for them. Drafts can be sent through PayPal as usual.
          </p>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          {parsed && parsed.rows.length > 0 && (
            <div className="rounded-[12px] border border-border">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs">
                <Badge tone="success">{valid.length} ready</Badge>
                <span className="text-muted-foreground">{invoiceCount} invoice(s), {valid.length - invoiceCount} client-only row(s)</span>
                {invalid.length > 0 && <Badge tone="danger">{invalid.length} with errors (skipped)</Badge>}
                {parsed.unknownColumns.length > 0 && <span className="text-muted-foreground">Ignored columns: {parsed.unknownColumns.join(", ")}</span>}
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Row</th>
                      <th className="px-3 py-1.5 font-medium">Client</th>
                      <th className="px-3 py-1.5 font-medium">Invoice</th>
                      <th className="px-3 py-1.5 text-right font-medium">Amount</th>
                      <th className="px-3 py-1.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 200).map((r) => (
                      <tr key={r.line} className="border-t border-border">
                        <td className="px-3 py-1.5 text-muted-foreground">{r.line}</td>
                        {r.data ? (
                          <>
                            <td className="px-3 py-1.5">{r.data.client_name}</td>
                            <td className="px-3 py-1.5">{r.data.description ?? <span className="text-muted-foreground">client only</span>}</td>
                            <td className="px-3 py-1.5 text-right tabular">{r.data.unit_amount != null ? `${r.data.currency} ${(r.data.unit_amount * r.data.quantity).toFixed(2)}` : ""}</td>
                            <td className="px-3 py-1.5">{r.data.unit_amount != null ? r.data.status.replace("_", " ") : ""}</td>
                          </>
                        ) : (
                          <td colSpan={4} className="px-3 py-1.5 text-danger">{r.errors.join("; ")}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={doImport} disabled={busy || valid.length === 0}>
            {busy ? "Importing…" : `Import ${valid.length} row${valid.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
