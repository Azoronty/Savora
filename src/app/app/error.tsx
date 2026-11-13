"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/lang-provider";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="eyebrow mb-4">{t("Something went wrong")}</p>
      <h1 className="text-3xl font-normal">{t("We couldn’t load this page.")}</h1>
      <p className="mt-3 text-muted">{t("Your data is safe. This is usually a brief connection problem — try again in a moment.")}</p>
      <Button onClick={reset} className="mt-8">
        <RotateCcw className="size-4" aria-hidden="true" /> {t("Try again")}
      </Button>
    </div>
  );
}
