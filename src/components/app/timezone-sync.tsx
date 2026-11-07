"use client";

import { useEffect } from "react";
import { saveTimeZone } from "@/lib/actions/savi";

/**
 * Sends the browser's IANA time zone to the server so "today" (expiry
 * labels) and daily XP caps follow the viewer's local calendar.
 */
export function TimezoneSync({ cookieZone, profileZone }: { cookieZone: string; profileZone: string }) {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && (zone !== cookieZone || zone !== profileZone)) void saveTimeZone(zone);
  }, [cookieZone, profileZone]);
  return null;
}
