"use client";

import { Sparkles } from "lucide-react";
import { demoLevelUp } from "@/lib/actions/savi";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/toast";
import { useT } from "@/components/i18n/lang-provider";

export function DemoLevelUp({ maxed }: { maxed: boolean }) {
  const { run, pending } = useAction();
  const t = useT();
  return (
    <div className="mt-5 rounded-xl border border-dashed border-saffron/60 bg-saffron-soft/40 p-4">
      <p className="text-sm font-medium">{t("Demo: level up Savi")}</p>
      <p className="mt-1 text-xs text-muted">{t("Adds just enough sample XP to reach the next stage, so you can see every form. Only in the demo; real accounts earn XP by saving food.")}</p>
      <Button size="sm" className="mt-3" pending={pending} disabled={maxed} onClick={() => run(demoLevelUp)}>
        {!pending && <Sparkles className="size-4" aria-hidden="true" />}
        {t(maxed ? "Savi is fully grown" : "Level up Savi")}
      </Button>
    </div>
  );
}
