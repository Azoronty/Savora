"use client";

import { useEffect } from "react";

/** Sets the time zone cookie before sign-in, so a new demo kitchen is dated in the visitor's local day. */
export function TimezoneCookie() {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && !document.cookie.includes("savora-tz=")) {
      document.cookie = `savora-tz=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, []);
  return null;
}
