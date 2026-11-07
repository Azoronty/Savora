import { USE_SOON_DAYS } from "./constants";
import { daysBetween, type IsoDate } from "./dates";

export type ExpiryStatus = "fresh" | "soon" | "expired";

export type ExpiryInfo = {
  status: ExpiryStatus;
  /** Days until the entered date; negative once it has passed. */
  daysLeft: number;
  label: string;
};

export const STATUS_LABEL: Record<ExpiryStatus, string> = {
  fresh: "Fresh",
  soon: "Use soon",
  expired: "Past date",
};

export function expiryStatus(daysLeft: number): ExpiryStatus {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= USE_SOON_DAYS) return "soon";
  return "fresh";
}

export function relativeExpiryLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Date is today";
  if (daysLeft === 1) return "1 day left";
  if (daysLeft === -1) return "1 day past";
  if (daysLeft < 0) return `${-daysLeft} days past`;
  if (daysLeft < 14) return `${daysLeft} days left`;
  if (daysLeft < 60) return `${Math.round(daysLeft / 7)} weeks left`;
  return `${Math.round(daysLeft / 30)} months left`;
}

export function getExpiry(expiresOn: IsoDate, today: IsoDate): ExpiryInfo {
  const daysLeft = daysBetween(today, expiresOn);
  return { status: expiryStatus(daysLeft), daysLeft, label: relativeExpiryLabel(daysLeft) };
}

/** Most urgent first (earliest date, so past-date items lead); ties by name. */
export function compareByUrgency(
  a: { expires_on: IsoDate; name: string },
  b: { expires_on: IsoDate; name: string },
): number {
  if (a.expires_on !== b.expires_on) return a.expires_on < b.expires_on ? -1 : 1;
  return a.name.localeCompare(b.name);
}
