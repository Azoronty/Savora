import type { MetadataRoute } from "next";
import { getT } from "@/lib/i18n/server";

// Installable on phones; on iPhone push reminders need the Home Screen app.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getT();
  return {
    name: t("Savora: use food before its date"),
    short_name: "Savora",
    description: t("Track the food you have, cook it before its date, waste less."),
    start_url: "/app",
    display: "standalone",
    background_color: "#f5f1e8",
    theme_color: "#1e3a2b",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
