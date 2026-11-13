"use client";

import { ChefHat, ShoppingBasket } from "lucide-react";
import { useState } from "react";
import { cookRecipe } from "@/lib/actions/products";
import { useSavi } from "@/components/savi/savi-companion";
import { addMissingFromRecipe } from "@/lib/actions/shopping";
import { UNIT_LABEL, type Unit } from "@/lib/domain/constants";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useT } from "@/components/i18n/lang-provider";
import { useAction } from "@/components/ui/toast";

export type CookableItem = { id: string; name: string; quantity: number; unit: Unit; amount: string; optional: boolean };

export function RecipeActions({ slug, missingCount, items }: { slug: string; missingCount: number; items: CookableItem[] }) {
  const { run, pending } = useAction();
  const t = useT();
  const savi = useSavi();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, { on: boolean; qty: string }>>(() =>
    Object.fromEntries(items.map((i) => [i.id, { on: !i.optional, qty: String(i.quantity) }])),
  );

  const chosen = items
    .filter((i) => selected[i.id]?.on)
    .map((i) => ({ id: i.id, quantity: Number(selected[i.id].qty.replace(",", ".")), max: i.quantity }));
  const valid = chosen.length > 0 && chosen.every((c) => Number.isFinite(c.quantity) && c.quantity > 0 && c.quantity <= c.max);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {items.length > 0 && (
        <Button onClick={() => setOpen(true)}>
          <ChefHat className="size-[18px]" aria-hidden="true" /> {t("I cooked this")}
        </Button>
      )}
      {missingCount > 0 && (
        <Button variant="secondary" pending={pending && !open} onClick={() => run(() => addMissingFromRecipe(slug))}>
          {!pending && <ShoppingBasket className="size-4" aria-hidden="true" />}
          {t("Add {n} missing to list", { n: missingCount })}
        </Button>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Update your inventory"
        description="Choose what you used. Amounts are pre-filled with everything you have — lower them if you used less."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              pending={pending}
              disabled={!valid}
              onClick={async () => {
                const r = await run(() => cookRecipe(slug, chosen.map(({ id, quantity }) => ({ id, quantity }))));
                if (r.ok) {
                  setOpen(false);
                  savi({ type: "recipe_cooked" });
                }
              }}
            >
              {t("Update inventory")}
            </Button>
          </>
        }
      >
        <ul className="flex flex-col divide-y divide-line">
          {items.map((item) => {
            const state = selected[item.id];
            const qty = Number(state.qty.replace(",", "."));
            const bad = state.on && !(qty > 0 && qty <= item.quantity);
            return (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <input
                  id={`use-${item.id}`}
                  type="checkbox"
                  checked={state.on}
                  onChange={(e) => setSelected((s) => ({ ...s, [item.id]: { ...s[item.id], on: e.target.checked } }))}
                  className="size-5 shrink-0 accent-forest"
                />
                <label htmlFor={`use-${item.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="text-xs text-muted">{t("Recipe uses")} {item.amount}</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    aria-label={t("Amount of {name} used", { name: item.name })}
                    inputMode="decimal"
                    value={state.qty}
                    disabled={!state.on}
                    aria-invalid={bad || undefined}
                    onChange={(e) => setSelected((s) => ({ ...s, [item.id]: { ...s[item.id], qty: e.target.value } }))}
                    className={cx(
                      "h-10 w-20 rounded-md border bg-card px-2 text-right text-sm tabular disabled:opacity-40",
                      bad ? "border-expired" : "border-line-strong",
                    )}
                  />
                  <span className="w-9 text-xs text-muted">/ {item.quantity} {t(UNIT_LABEL[item.unit])}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </div>
  );
}
