import { NextResponse } from "next/server";
import { z } from "zod";
import { removeDemoData, seedDemoData } from "@/lib/db/seed";
import { apiRoute } from "@/lib/server";

const schema = z.object({ replace: z.boolean().optional() });

/**
 * Load the labelled demo dataset (all rows is_demo = true) in the user's
 * reporting currency. `replace: true` first removes existing demo rows, so the
 * demo can be reloaded after changing currency. Real data is never touched.
 */
export const POST = apiRoute(async (req, { ctx, profile }) => {
  const { replace } = schema.parse(await req.json().catch(() => ({})));
  if (replace) await removeDemoData(ctx.db);
  const r = await seedDemoData(ctx.db, new Date(), profile.default_currency);
  return NextResponse.json({
    ...r,
    message: r.created ? `Demo data loaded in ${profile.default_currency}.` : "Demo data is already loaded. Use Reload to switch it to your reporting currency.",
  });
});
