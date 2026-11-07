"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/lib/data/queries";
import { Sheet } from "@/components/ui/sheet";
import { ProductForm, type ProductPrefill } from "@/components/inventory/product-form";

type SheetState = { mode: "new"; prefill?: ProductPrefill; key: number } | { mode: "edit"; product: Product; key: number } | null;
type Api = { openNew: (prefill?: ProductPrefill) => void; openEdit: (product: Product) => void };

const ProductSheetContext = createContext<Api | null>(null);

export function ProductSheetProvider({ today, children }: { today: string; children: ReactNode }) {
  const [state, setState] = useState<SheetState>(null);
  const close = useCallback(() => setState(null), []);
  const api = useMemo<Api>(
    () => ({
      openNew: (prefill) => setState({ mode: "new", prefill, key: Date.now() }),
      openEdit: (product) => setState({ mode: "edit", product, key: Date.now() }),
    }),
    [],
  );

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
        {state && (
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
