"use client";

import { ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import { startDemo } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";

/** Starts an anonymous demo session with a sample kitchen. */
export function DemoButton({ variant = "primary", label = "Explore the live demo" }: { variant?: "primary" | "secondary"; label?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col">
      <Button
        variant={variant}
        size="lg"
        pending={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await startDemo();
            if (result && !result.ok) setError(result.error);
          })
        }
      >
        {pending ? "Preparing your kitchen…" : label}
        {!pending && <ArrowRight className="size-4" aria-hidden="true" />}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-expired">
          {error}
        </p>
      )}
    </div>
  );
}
