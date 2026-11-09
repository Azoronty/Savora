import type { MetadataRoute } from "next";

// Installable on phones; on iPhone push reminders need the Home Screen app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Savora: use food before its date",
    short_name: "Savora",
    description: "Track the food you have, cook it before its date, waste less.",
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
