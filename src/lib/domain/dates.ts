/**
 * Date-only helpers. Expiry and purchase dates are calendar dates
 * ("YYYY-MM-DD"), not instants, so all arithmetic runs on whole UTC days and
 * never on local Date objects — this avoids off-by-one errors across time zones.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export type IsoDate = string;

export function isIsoDate(value: string): value is IsoDate {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function toDayNumber(iso: IsoDate): number {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`Invalid date: ${iso}`);
  const [, y, m, d] = match.map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

export function fromDayNumber(day: number): IsoDate {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return fromDayNumber(toDayNumber(iso) + days);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date it currently is for someone in `timeZone`. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const shortFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const longFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function formatShortDate(iso: IsoDate): string {
  return shortFormat.format(new Date(toDayNumber(iso) * MS_PER_DAY));
}

export function formatLongDate(iso: IsoDate): string {
  return longFormat.format(new Date(toDayNumber(iso) * MS_PER_DAY));
}

/** Monday of the ISO week containing `iso`. */
export function startOfWeek(iso: IsoDate): IsoDate {
  const day = toDayNumber(iso);
  const weekday = (new Date(day * MS_PER_DAY).getUTCDay() + 6) % 7; // Mon = 0
  return fromDayNumber(day - weekday);
}
