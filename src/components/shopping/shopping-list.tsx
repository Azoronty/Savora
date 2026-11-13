"use client";

import { ArrowRight, BookOpen, Info, Plus, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { addShoppingItem, clearPurchased, removeShoppingItem, setPurchased } from "@/lib/actions/shopping";
import { matchCatalog } from "@/lib/domain/catalog";
import { CATEGORIES, CATEGORY_LABEL, UNITS, UNIT_LABEL, type Unit } from "@/lib/domain/constants";
import { formatQuantity } from "@/lib/domain/format";
import { findDuplicate, findInStock, itemIdentity } from "@/lib/domain/shopping";
import type { QuantitySuggestion } from "@/lib/domain/predict";
import type { ShoppingItem } from "@/lib/data/queries";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { Select, controlClass } from "@/components/ui/field";
import { useAction } from "@/components/ui/toast";
import { SampleTag } from "@/components/inventory/product-row";
import { StockSheet } from "./stock-sheet";
import { useT } from "@/components/i18n/lang-provider";
import { useSavi } from "@/components/savi/savi-companion";

type Stock = { name: string; expires_on: string }[];

export function ShoppingList({
  items,
  stock,
  today,
  suggestions = [],
}: {
  items: ShoppingItem[];
  stock: Stock;
  today: string;
  suggestions?: QuantitySuggestion[];
}) {
  const open = items.filter((i) => !i.purchased_at);
  const bought = items.filter((i) => i.purchased_at);
  const [stocking, setStocking] = useState(false);
  const { run, pending } = useAction();
  const t = useT();

  const grouped = useMemo(
    () =>
      CATEGORIES.map((category) => ({ category, items: open.filter((i) => i.category === category) })).filter(
        (g) => g.items.length > 0,
      ),
    [open],
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <AddItemForm open={open} stock={stock} today={today} suggestions={suggestions} />

        {open.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
            <p className="font-display text-xl">{t("Your list is clear")}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              {t("Add items above, or open a recipe and add its missing ingredients in one tap.")}
            </p>
            <Link href="/app/meals" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-forest-mid hover:underline">
              {t("Browse meals")} <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            {grouped.map((group) => (
              <section key={group.category} aria-label={t(CATEGORY_LABEL[group.category])}>
                <h2 className="eyebrow mb-2">{t(CATEGORY_LABEL[group.category])}</h2>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                  {group.items.map((item) => (
                    <ItemRow key={item.id} item={item} hint={findInStock(item.name, stock, today)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="rounded-xl border border-line bg-card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-medium">{t("In the basket")}</h2>
            <span className="font-mono text-xs text-muted tabular">{bought.length}</span>
          </div>
          {bought.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("Tick items as you shop. They wait here until you put them away.")}</p>
          ) : (
            <>
              <ul className="mt-4 flex flex-col gap-1">
                {bought.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => run(() => setPurchased(item.id, false), { quiet: true })}
                      aria-label={t("Move {name} back to the list", { name: t(item.name) })}
                      className="size-4 accent-forest"
                    />
                    <span className="flex-1 truncate text-sm text-muted line-through decoration-line-strong">{t(item.name)}</span>
                    <span className="text-xs text-faint tabular">{t(formatQuantity(Number(item.quantity), item.unit))}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5">
                <Button onClick={() => setStocking(true)}>
                  {t("Put {n} away", { n: bought.length })} <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="sm" pending={pending} onClick={() => run(clearPurchased)}>
                  {t("Clear without adding")}
                </Button>
              </div>
            </>
          )}
        </div>
        <p className="mt-4 flex gap-2 px-1 text-[0.8125rem] text-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("Putting items away moves them into your inventory with a suggested date you can adjust.")}
        </p>
      </aside>

      <StockSheet open={stocking} onClose={() => setStocking(false)} items={bought} today={today} />
    </div>
  );
}

function ItemRow({ item, hint }: { item: ShoppingItem; hint?: { name: string; daysLeft: number } }) {
  const { run } = useAction();
  const t = useT();
  const [optimistic, setOptimistic] = useState(false);
  return (
    <li className={cx("flex items-start gap-3 px-4 py-3.5 transition-opacity sm:px-5", optimistic && "opacity-40")}>
      <input
        id={`item-${item.id}`}
        type="checkbox"
        checked={optimistic}
        onChange={async () => {
          setOptimistic(true);
          const r = await run(() => setPurchased(item.id, true), { quiet: true });
          if (!r.ok) setOptimistic(false);
        }}
        className="mt-1 size-5 shrink-0 accent-forest"
      />
      <label htmlFor={`item-${item.id}`} className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{t(item.name)}</span>
          <span className="text-sm text-muted tabular">{t(formatQuantity(Number(item.quantity), item.unit))}</span>
          {item.is_demo && <SampleTag />}
        </span>
        {(item.note || item.source === "recipe") && (
          <span className="mt-0.5 flex items-center gap-1.5 text-[0.8125rem] text-muted">
            {item.source === "recipe" && <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />}
            {item.note && t(item.note)}
          </span>
        )}
        {hint && (
          <span className="mt-1.5 inline-flex rounded-md bg-soon-soft px-2 py-0.5 text-xs text-soon">
            {t("You have “{name}”", { name: t(hint.name) })} · {t(hint.daysLeft === 1 ? "1 day left" : `${hint.daysLeft} days left`)}
          </span>
        )}
      </label>
      <button
        type="button"
        onClick={() => run(() => removeShoppingItem(item.id))}
        aria-label={t("Remove {name}", { name: t(item.name) })}
        className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-paper-deep hover:text-ink"
      >
        <X className="size-4" />
      </button>
    </li>
  );
}

function AddItemForm({ open, stock, today, suggestions }: { open: ShoppingItem[]; stock: Stock; today: string; suggestions: QuantitySuggestion[] }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<Unit>("pcs");
  const [unitTouched, setUnitTouched] = useState(false);
  const { run, pending } = useAction();
  const t = useT();
  const savi = useSavi();

  const trimmed = name.trim();
  const duplicate = trimmed.length > 1 ? findDuplicate(trimmed, open) : undefined;
  const inStock = trimmed.length > 1 ? findInStock(trimmed, stock, today) : undefined;
  const smart = trimmed.length > 1 ? suggestions.find((s) => s.key === itemIdentity(trimmed)) : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || duplicate) return;
    const entry = matchCatalog(trimmed);
    const r = await run(() =>
      addShoppingItem({
        name: trimmed,
        quantity,
        unit: unitTouched ? unit : (entry?.unit ?? unit),
        category: entry?.category ?? "other",
      }),
    );
    if (r.ok) {
      savi({ type: "shopping_added", name: trimmed });
      setName("");
      setQuantity("1");
      setUnitTouched(false);
      setUnit("pcs");
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-card p-3 shadow-soft">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="shopping-name" className="sr-only">
          {t("Item")}
        </label>
        <input
          id="shopping-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("Add an item, e.g. lemons")}
          maxLength={80}
          autoComplete="off"
          aria-describedby="shopping-hint"
          className={cx(controlClass, "flex-1 border-transparent bg-paper/60 hover:border-line-strong")}
        />
        <div className="flex gap-2">
          <label htmlFor="shopping-qty" className="sr-only">
            {t("Quantity")}
          </label>
          <input
            id="shopping-qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputMode="decimal"
            className={cx(controlClass, "w-20 border-transparent bg-paper/60 text-center tabular hover:border-line-strong")}
          />
          <label htmlFor="shopping-unit" className="sr-only">
            {t("Unit")}
          </label>
          <div className="w-24">
            <Select
              id="shopping-unit"
              value={unitTouched ? unit : (matchCatalog(trimmed)?.unit ?? unit)}
              onChange={(e) => {
                setUnit(e.target.value as Unit);
                setUnitTouched(true);
              }}
              className="border-transparent bg-paper/60 hover:border-line-strong"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(UNIT_LABEL[u])}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" pending={pending} disabled={!trimmed || Boolean(duplicate)} className="shrink-0">
            {!pending && <Plus className="size-4" aria-hidden="true" />}
            {t("Add")}
          </Button>
        </div>
      </div>
      <p id="shopping-hint" aria-live="polite" className="min-h-0 px-1 text-[0.8125rem]">
        {duplicate ? (
          <span className="mt-2 block text-expired">{t("“{name}” is already on your list.", { name: t(duplicate.name) })}</span>
        ) : smart && !(unitTouched && unit === smart.unit && Number(quantity) === smart.suggested) ? (
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-forest-mid">
            <span>
              {t("Predictive Kitchen: you usually buy {qty} and about {p}% gets thrown away.", { qty: t(formatQuantity(Math.round(smart.usual * 100) / 100, smart.unit)), p: Math.round(smart.wasteShare * 100) })}
            </span>
            <button
              type="button"
              onClick={() => {
                setQuantity(String(smart.suggested));
                setUnit(smart.unit);
                setUnitTouched(true);
              }}
              className="rounded-full border border-forest-mid/40 px-2.5 py-0.5 text-xs font-medium hover:bg-forest-wash"
            >
              {t("Use {qty}", { qty: t(formatQuantity(smart.suggested, smart.unit)) })}
            </button>
          </span>
        ) : inStock ? (
          <span className="mt-2 block text-soon">
            {t("Already at home: “{name}”, {left}. Still need more?", { name: t(inStock.name), left: t(inStock.daysLeft === 1 ? "1 day left" : `${inStock.daysLeft} days left`) })}
          </span>
        ) : null}
      </p>
    </form>
  );
}
