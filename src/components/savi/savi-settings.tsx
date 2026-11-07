"use client";

import { useState } from "react";
import { setSaviMode } from "@/lib/actions/savi";
import { Segmented } from "@/components/ui/field";
import { useAction } from "@/components/ui/toast";

type Mode = "full" | "quiet" | "hidden";

export function SaviSettings({ mode }: { mode: Mode }) {
  const [value, setValue] = useState<Mode>(mode);
  const { run } = useAction();
  return (
    <div className="max-w-md">
      <Segmented
        name="savi-mode"
        label="How Savi behaves"
        value={value}
        options={[
          { value: "full", label: "Lively" },
          { value: "quiet", label: "Quiet" },
          { value: "hidden", label: "Hidden" },
        ]}
        onChange={async (next) => {
          const previous = value;
          setValue(next);
          const r = await run(() => setSaviMode(next));
          if (!r.ok) setValue(previous);
        }}
      />
      <p className="mt-2 text-[0.8125rem] text-muted">
        Quiet keeps Savi around without speech bubbles. Hidden removes Savi from every page; XP and missions still count. Savi also follows
        your system’s reduced-motion setting.
      </p>
    </div>
  );
}
