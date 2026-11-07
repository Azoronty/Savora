"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="eyebrow mb-4">Something went wrong</p>
      <h1 className="text-3xl font-normal">We couldn’t load this page.</h1>
      <p className="mt-3 text-muted">Your data is safe. This is usually a brief connection problem — try again in a moment.</p>
      <Button onClick={reset} className="mt-8">
        <RotateCcw className="size-4" aria-hidden="true" /> Try again
      </Button>
    </div>
  );
}
