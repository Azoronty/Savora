"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/lib/data/queries";
import { Sheet } from "@/components/ui/sheet";
import { ProductForm, type ProductPrefill } from "@/components/inventory/product-form";
import { QuickAddForm } from "@/components/inventory/quick-add-form";
import { cx } from "@/lib/cx";
import { useT } from "@/components/i18n/lang-provider";

type SheetState = { mode: "new"; prefill?: ProductPrefill; key: number } | { mode: "edit"; product: Product; key: number } | null;
type Api = { openNew: (prefill?: ProductPrefill) => void; openEdit: (product: Product) => void };

const ProductSheetContext = createContext<Api | null>(null);

export function ProductSheetProvider({ today, children }: { today: string; children: ReactNode }) {
  const [state, setState] = useState<SheetState>(null);
  const [many, setMany] = useState(false);
  const close = useCallback(() => setState(null), []);
  const api = useMemo<Api>(
    () => ({
      openNew: (prefill) => {
        setMany(false);
        setState({ mode: "new", prefill, key: Date.now() });
      },
      openEdit: (product) => setState({ mode: "edit", product, key: Date.now() }),
    }),
    [],
  );

  const t = useT();
  return (
    <ProductSheetContext value={api}>
      {children}
      <Sheet
        open={state !== null}
        onClose={close}
        title={state?.mode === "edit" ? "Edit product" : "Add a product"}
        description={
          state?.mode === "edit"
            ? state.product.name
            : "Start typing and Savora fills in the rest. Adjust anything that doesn't match."
        }
      >
        {state?.mode === "new" && !state.prefill && (
          <div className="mb-5 grid grid-cols-2 rounded-full border border-line bg-paper-deep p-1 text-sm" role="group" aria-label={t("How to add")}>
            {[
              [false, "One item"],
              [true, "Several · voice"],
            ].map(([value, label]) => (
              <button
                key={String(value)}
                type="button"
                aria-pressed={many === value}
                onClick={() => setMany(value as boolean)}
                className={cx("h-9 rounded-full font-medium transition-colors", many === value ? "bg-card text-ink shadow-soft" : "text-muted hover:text-ink")}
              >
                {t(label as string)}
              </button>
            ))}
          </div>
        )}
        {state?.mode === "new" && !state.prefill && many ? (
          <QuickAddForm key={state.key} today={today} onDone={close} />
        ) : state && (
          <ProductForm
            key={state.key}
            today={today}
            product={state.mode === "edit" ? state.product : undefined}
            prefill={state.mode === "new" ? state.prefill : undefined}
            onDone={close}
          />
        )}
      </Sheet>
    </ProductSheetContext>
  );
}

export function useProductSheet(): Api {
  const ctx = useContext(ProductSheetContext);
  if (!ctx) throw new Error("useProductSheet must be used inside <ProductSheetProvider>");
  return ctx;
}
