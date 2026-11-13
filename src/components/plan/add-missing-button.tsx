"use client";

import { ShoppingBasket } from "lucide-react";
import { addMissingFromRecipe } from "@/lib/actions/shopping";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/toast";
import { useT } from "@/components/i18n/lang-provider";

export function AddMissingButton({ slug, count }: { slug: string; count: number }) {
  const { run, pending } = useAction();
  const t = useT();
  return (
    <Button size="sm" variant="secondary" pending={pending} onClick={() => run(() => addMissingFromRecipe(slug))}>
      {!pending && <ShoppingBasket className="size-4" aria-hidden="true" />}
      {t("Add {n} missing to list", { n: count })}
    </Button>
  );
}
