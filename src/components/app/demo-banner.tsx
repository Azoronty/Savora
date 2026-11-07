"use client";

import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { clearSampleData } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/toast";

/** Makes sample data unmistakable and easy to remove. */
export function DemoBanner({ isAnonymous }: { isAnonymous: boolean }) {
  const { run, pending } = useAction();
  return (
    <div className="border-b border-saffron/25 bg-saffron-soft/60">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-4 py-2.5 text-sm text-ink-2 sm:flex-row sm:items-center sm:px-6 lg:px-10">
        <p className="flex items-start gap-2 sm:items-center">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-soon sm:mt-0" aria-hidden="true" />
          <span>
            {isAnonymous ? "You're exploring a demo kitchen. " : ""}
            Items tagged <strong className="font-medium text-ink">Sample</strong> are demonstration data, not real activity.
          </span>
        </p>
        <div className="flex gap-1 sm:ml-auto">
          <Button variant="ghost" size="sm" pending={pending} onClick={() => run(clearSampleData)}>
            Clear sample data
          </Button>
          {isAnonymous && (
            <Link href="/signup" className="inline-flex h-9 items-center rounded-md px-3 font-medium text-forest underline-offset-4 hover:underline">
              Create an account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
