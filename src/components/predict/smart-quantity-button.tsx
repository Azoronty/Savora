"use client";

import { ShoppingBasket } from "lucide-react";
import { applySmartQuantity } from "@/lib/actions/shopping";
import { getCatalogEntry } from "@/lib/domain/catalog";
import { formatQuantity } from "@/lib/domain/format";
import type { Unit } from "@/lib/domain/constants";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/toast";
import { useSavi } from "@/components/savi/savi-companion";
import { useT } from "@/components/i18n/lang-provider";

export function SmartQuantityButton({ name, itemKey, quantity, unit }: { name: string; itemKey: string; quantity: number; unit: Unit }) {
  const { run, pending } = useAction();
  const t = useT();
  const savi = useSavi();
  return (
    <Button
      variant="secondary"
      size="sm"
      pending={pending}
      onClick={async () => {
        const r = await run(() =>
          applySmartQuantity({ name, quantity, unit, category: getCatalogEntry(itemKey)?.category ?? "other" }),
        );
        if (r.ok) savi({ type: "shopping_added", name });
      }}
    >
      {!pending && <ShoppingBasket className="size-4" aria-hidden="true" />}
      {t("Put {qty} on the list", { qty: t(formatQuantity(quantity, unit)) })}
    </Button>
  );
}
