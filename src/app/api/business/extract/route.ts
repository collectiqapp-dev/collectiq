import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { apiRoute, jsonError } from "@/lib/server";
import { extractBusinessDetails } from "@/lib/website";

const schema = z.object({ url: z.string().trim().min(3).max(300) });

/** Suggest business details from the user's website. Nothing is saved here. */
export const POST = apiRoute(async (req, { user }) => {
  if (!rateLimit(`website:${user.id}`, 5, 60_000).ok) return jsonError("Please wait a minute before trying again.", 429, "rate_limited");
  const { url } = schema.parse(await req.json());
  return NextResponse.json(await extractBusinessDetails(url));
});
