import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/server";
import { ServiceError, recordActivity } from "@/lib/services/context";
import type { Profile } from "@/lib/types";
import { settingsSchema } from "@/lib/validation";

export const PATCH = apiRoute(async (req, { ctx, profile }) => {
  const { tour_completed, ...rest } = settingsSchema.parse(await req.json());
  const patch: Partial<Profile> = { ...(rest as Partial<Profile>) };
  if (tour_completed !== undefined) patch.tour_completed_at = tour_completed ? new Date().toISOString() : null;
  if (patch.business_email === "") patch.business_email = null;
  let updated: Profile;
  try {
    updated = await ctx.db.updateProfile(patch);
  } catch (e) {
    // Clear guidance if the second migration hasn't been applied yet.
    if (/business_|tour_completed_at/.test((e as Error).message)) {
      throw new ServiceError(
        "Your database is missing the business-profile columns. Run supabase/migrations/20261109120000_business_profile_and_onboarding.sql in the Supabase SQL editor.",
        500,
        "migration_missing",
      );
    }
    throw e;
  }
  const changes: string[] = [];
  if (patch.autonomy_mode && patch.autonomy_mode !== profile.autonomy_mode) changes.push(`autonomy mode → ${patch.autonomy_mode}`);
  if (patch.agent_paused !== undefined && patch.agent_paused !== profile.agent_paused) changes.push(patch.agent_paused ? "agent paused" : "agent resumed");
  if (changes.length) {
    await recordActivity(ctx, {
      category: "settings_changed",
      trigger: "You changed Settings",
      proposed_action: changes.join(", "),
      execution_status: "succeeded",
    });
  }
  return NextResponse.json({ profile: updated });
});
