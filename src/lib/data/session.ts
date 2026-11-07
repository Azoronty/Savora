import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { todayIn } from "@/lib/domain/dates";
import { createClient } from "@/lib/supabase/server";

export const TIMEZONE_COOKIE = "savora-tz";

export type Viewer = {
  userId: string;
  email: string | null;
  isAnonymous: boolean;
  householdId: string;
  householdName: string;
  displayName: string | null;
  onboarded: boolean;
  /** The viewer's local calendar date, from their browser time zone. */
  today: string;
  timeZone: string;
  /** Time zone stored on the profile (used by the database for daily XP caps). */
  profileTimeZone: string;
  saviMode: "full" | "quiet" | "hidden";
};

/**
 * The Data Access Layer entry point: resolves the signed-in user and their
 * household once per request. Returns null when signed out.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("household_id, display_name, onboarded_at, timezone, savi_mode, households(name)")
    .eq("id", user.id)
    .single();
  if (error || !profile) {
    throw new Error("Your household profile could not be loaded.", { cause: error });
  }

  const timeZone = (await cookies()).get(TIMEZONE_COOKIE)?.value ?? profile.timezone;
  return {
    userId: user.id,
    email: user.email ?? null,
    isAnonymous: user.is_anonymous ?? false,
    householdId: profile.household_id,
    householdName: profile.households?.name ?? "My kitchen",
    displayName: profile.display_name,
    onboarded: profile.onboarded_at !== null,
    today: todayIn(timeZone),
    timeZone,
    profileTimeZone: profile.timezone,
    saviMode: profile.savi_mode,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}
