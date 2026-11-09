"use client";

import { ShoppingBasket } from "lucide-react";
import { addMissingFromRecipe } from "@/lib/actions/shopping";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/toast";

export function AddMissingButton({ slug, count }: { slug: string; count: number }) {
  const { run, pending } = useAction();
  return (
    <Button size="sm" variant="secondary" pending={pending} onClick={() => run(() => addMissingFromRecipe(slug))}>
      {!pending && <ShoppingBasket className="size-4" aria-hidden="true" />}
      Add {count} missing to list
    </Button>
  );
}
