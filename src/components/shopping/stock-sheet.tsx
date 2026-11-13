"use client";

import { useState } from "react";
import { stockPurchasedItems } from "@/lib/actions/shopping";
import { matchCatalog, suggestedShelfDays } from "@/lib/domain/catalog";
import { itemIdentity } from "@/lib/domain/shopping";
import { STORAGES, STORAGE_LABEL, type Storage } from "@/lib/domain/constants";
import { addDays } from "@/lib/domain/dates";
import { formatQuantity, parseMoneyToCents } from "@/lib/domain/format";
import type { ShoppingItem } from "@/lib/data/queries";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useAction } from "@/components/ui/toast";
import type { StockItemsInput } from "@/lib/validation";
import { useT } from "@/components/i18n/lang-provider";
import { useSavi } from "@/components/savi/savi-companion";

type Row = { include: boolean; storage: Storage; expires_on: string; price: string; guessed: boolean };

function initialRows(items: ShoppingItem[], today: string): Record<string, Row> {
  return Object.fromEntries(
    items.map((item) => {
      const entry = matchCatalog(item.name);
      const storage = entry?.storage ?? "fridge";
      return [
        item.id,
        {
          include: true,
          storage,
          expires_on: addDays(today, entry ? suggestedShelfDays(entry, storage) : 7),
          price: "",
          guessed: true,
        },
      ];
    }),
  );
}

export function StockSheet({ open, onClose, items, today }: { open: boolean; onClose: () => void; items: ShoppingItem[]; today: string }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title="Put shopping away"
      description="Check where each item goes and the date on its package. Suggested dates are typical, not guaranteed."
    >
      {open && <StockForm key={items.map((i) => i.id).join()} items={items} today={today} onDone={onClose} />}
    </Sheet>
  );
}

function StockForm({ items, today, onDone }: { items: ShoppingItem[]; today: string; onDone: () => void }) {
  const [rows, setRows] = useState(() => initialRows(items, today));
  const [error, setError] = useState<string | null>(null);
  const { run, pending } = useAction();
  const t = useT();
  const savi = useSavi();

  const update = (id: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  const included = items.filter((i) => rows[i.id]?.include);

  const changeStorage = (item: ShoppingItem, storage: Storage) => {
    const row = rows[item.id];
    const entry = matchCatalog(item.name);
    update(item.id, {
      storage,
      ...(row.guessed && entry ? { expires_on: addDays(today, suggestedShelfDays(entry, storage)) } : {}),
    });
  };

  const submit = async () => {
    setError(null);
    const payload: StockItemsInput["items"] = [];
    for (const item of included) {
      const row = rows[item.id];
      const cents = parseMoneyToCents(row.price);
      if (Number.isNaN(cents)) {
        setError(t("Check the price for {name}.", { name: t(item.name) }));
        return;
      }
      if (row.expires_on < today) {
        setError(t("The date for {name} is before today.", { name: t(item.name) }));
        return;
      }
      payload.push({
        shopping_item_id: item.id,
        name: item.name,
        item_key: itemIdentity(item.name),
        quantity: Number(item.quantity),
        unit: item.unit,
        category: item.category,
        storage: row.storage,
        expires_on: row.expires_on,
        price_cents: cents,
      });
    }
    const r = await run(() => stockPurchasedItems({ purchased_on: today, items: payload }));
    if (r.ok) {
      onDone();
      savi({ type: "shopping_stocked", count: payload.length });
    } else setError(t(r.error));
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => {
          const row = rows[item.id];
          return (
            <li key={item.id} className={cx("flex flex-col gap-3 py-4", !row.include && "opacity-50")}>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={row.include}
                  onChange={(e) => update(item.id, { include: e.target.checked })}
                  className="size-5 accent-forest"
                />
                <span className="font-medium">{t(item.name)}</span>
                <span className="text-sm text-muted tabular">{t(formatQuantity(Number(item.quantity), item.unit))}</span>
              </label>
              {row.include && (
                <div className="grid grid-cols-2 gap-2 pl-8 sm:grid-cols-[1fr_1fr_6.5rem]">
                  <div>
                    <label htmlFor={`st-${item.id}`} className="mb-1 block text-xs text-muted">
                      {t("Stored in")}
                    </label>
                    <select
                      id={`st-${item.id}`}
                      value={row.storage}
                      onChange={(e) => changeStorage(item, e.target.value as Storage)}
                      className={cx(controlClass, "h-10")}
                    >
                      {STORAGES.map((s) => (
                        <option key={s} value={s}>
                          {t(STORAGE_LABEL[s])}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`ex-${item.id}`} className="mb-1 block text-xs text-muted">
                      {t("Package date")}
                    </label>
                    <input
                      id={`ex-${item.id}`}
                      type="date"
                      value={row.expires_on}
                      min={today}
                      onChange={(e) => update(item.id, { expires_on: e.target.value, guessed: false })}
                      className={cx(controlClass, "h-10")}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor={`pr-${item.id}`} className="mb-1 block text-xs text-muted">
                      {t("Price")} <span className="text-faint">({t("optional")})</span>
                    </label>
                    <input
                      id={`pr-${item.id}`}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={row.price}
                      onChange={(e) => update(item.id, { price: e.target.value })}
                      className={cx(controlClass, "h-10 tabular")}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="rounded-md bg-expired-soft px-3 py-2 text-sm text-expired">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-5 flex justify-end border-t border-line bg-card px-5 pt-4 sm:-mx-7 sm:px-7">
        <Button pending={pending} disabled={included.length === 0} onClick={submit} className="w-full sm:w-auto">
          {t("Add {n} to inventory", { n: included.length })}
        </Button>
      </div>
    </div>
  );
}
