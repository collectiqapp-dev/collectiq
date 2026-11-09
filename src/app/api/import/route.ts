import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute } from "@/lib/server";
import { importRows } from "@/lib/services/import";

const schema = z.object({
  rows: z.array(z.object({ line: z.number().int(), data: z.record(z.string(), z.unknown()) })).min(1).max(1000),
});

/** Import validated spreadsheet rows (parsed in the browser, re-validated here). */
export const POST = apiRoute(async (req, { ctx }) => {
  const { rows } = schema.parse(await req.json());
  return NextResponse.json(await importRows(ctx, rows));
});
