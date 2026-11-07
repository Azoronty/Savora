import "server-only";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data/session";
import { createClient } from "@/lib/supabase/server";

/** Resolve the caller for a Server Action. RLS enforces access; householdId scopes inserts. */
export async function actionContext() {
  const viewer = await getViewer();
  if (!viewer) return null;
  return { viewer, supabase: await createClient() };
}

/** Every app page reads from the same household data, so refresh the whole /app tree. */
export function refreshApp() {
  revalidatePath("/app", "layout");
}
