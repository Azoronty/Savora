"use client";

import { FlaskConical, Sprout } from "lucide-react";
import { useState } from "react";
import { completeOnboarding } from "@/lib/actions/account";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { Field, Input, describedBy } from "@/components/ui/field";
import { useAction } from "@/components/ui/toast";
import { useT } from "@/components/i18n/lang-provider";

export function WelcomeForm({ defaultName }: { defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [withSample, setWithSample] = useState(true);
  const [error, setError] = useState<string>();
  const { run, pending } = useAction();
  const t = useT();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await run(() => completeOnboarding({ householdName: name, withSample }));
        if (!r.ok) setError(r.fieldErrors?.householdName);
      }}
      className="flex flex-col gap-8"
    >
      <Field id="household" label="What should we call your kitchen?" error={error}>
        <Input
          id="household"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy("household", error)}
        />
      </Field>

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-ink-2">{t("How would you like to start?")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              value: true,
              icon: FlaskConical,
              title: "With a sample kitchen",
              body: "40 example products with a realistic mix of dates. Tagged “Sample” and removable in one click.",
            },
            {
              value: false,
              icon: Sprout,
              title: "With an empty kitchen",
              body: "Add your own products from the start. Quick add fills in most details for you.",
            },
          ].map((opt) => (
            <label
              key={String(opt.value)}
              className={cx(
                "flex cursor-pointer flex-col rounded-xl border p-5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest-mid",
                withSample === opt.value ? "border-forest bg-forest-wash" : "border-line-strong bg-card hover:border-ink-2",
              )}
            >
              <input type="radio" name="start" className="sr-only" checked={withSample === opt.value} onChange={() => setWithSample(opt.value)} />
              <opt.icon className="mb-4 size-5 text-forest-mid" aria-hidden="true" />
              <span className="font-medium">{t(opt.title)}</span>
              <span className="mt-1 text-sm text-muted">{t(opt.body)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" size="lg" pending={pending} className="self-start">
        {t("Open my kitchen")}
      </Button>
    </form>
  );
}
