import { CURRENCY, UNIT_LABEL, type Unit } from "./constants";

const quantityFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const moneyFormats = {
  en: new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY }),
  ru: new Intl.NumberFormat("ru-RU", { style: "currency", currency: CURRENCY }),
};

export function formatQuantity(quantity: number, unit: Unit): string {
  return `${quantityFormat.format(quantity)} ${UNIT_LABEL[unit]}`;
}

export function formatMoney(cents: number, lang: "en" | "ru" = "en"): string {
  return moneyFormats[lang].format(cents / 100);
}

/** "3.49" → 349. Returns null for empty input; NaN signals invalid input. */
export function parseMoneyToCents(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return Number.NaN;
  return Math.round(Number(trimmed) * 100);
}

export function centsToInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
