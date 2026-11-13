"use client";

import { FlaskConical, Plus } from "lucide-react";
import { loadSampleData } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/toast";
import { useProductSheet } from "@/components/app/product-sheet";
import { useT } from "@/components/i18n/lang-provider";

export function QuickAddButton({ label, hideOnMobile = false }: { label: string; hideOnMobile?: boolean }) {
  const { openNew } = useProductSheet();
  return (
    <Button onClick={() => openNew()} className={hideOnMobile ? "self-start max-sm:hidden! sm:self-auto" : "self-start sm:self-auto"}>
      <Plus className="size-[18px]" aria-hidden="true" />
      {label}
    </Button>
  );
}

export function LoadSampleButton() {
  const { run, pending } = useAction();
  const t = useT();
  return (
    <Button variant="secondary" pending={pending} onClick={() => run(loadSampleData)}>
      {!pending && <FlaskConical className="size-4" aria-hidden="true" />}
      {t("Load a sample kitchen")}
    </Button>
  );
}
