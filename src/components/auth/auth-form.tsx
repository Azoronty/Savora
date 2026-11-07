"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/lib/actions/account";
import type { ActionResult } from "@/lib/actions/result";
import { Button } from "@/components/ui/button";
import { Field, Input, describedBy } from "@/components/ui/field";
import { DemoButton } from "./demo-button";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(mode === "login" ? signIn : signUp, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok && !state.fieldErrors ? state.error : null;
  const notice = state?.ok ? state.message : null;

  return (
    <div className="w-full max-w-[25rem]">
      <h1 className="text-[2.4rem] font-normal leading-[1.05]">{mode === "login" ? "Welcome back." : "Make your kitchen easier."}</h1>
      <p className="mt-3 text-[0.9375rem] text-muted">
        {mode === "login" ? "Sign in to see what needs using today." : "Free to use. Your data stays private to your household."}
      </p>

      <form action={action} className="mt-8 flex flex-col gap-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {mode === "signup" && (
          <Field id="displayName" label="Your name" optional>
            <Input id="displayName" name="displayName" autoComplete="given-name" maxLength={60} />
          </Field>
        )}
        <Field id="email" label="Email" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={describedBy("email", errors.email)}
          />
        </Field>
        <Field id="password" label="Password" error={errors.password} hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            aria-invalid={Boolean(errors.password) || undefined}
            aria-describedby={describedBy("password", errors.password, mode === "signup" ? "At least 8 characters." : undefined)}
          />
        </Field>
        {formError && (
          <p role="alert" className="rounded-md bg-expired-soft px-3 py-2.5 text-sm text-expired">
            {formError}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-md bg-fresh-soft px-3 py-2.5 text-sm text-fresh">
            {notice}
          </p>
        )}
        <Button type="submit" size="lg" pending={pending} className="mt-2">
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="my-7 flex items-center gap-4 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      <DemoButton variant="secondary" />
      <p className="mt-3 text-center text-[0.8125rem] text-muted">Opens a sample kitchen. No email needed.</p>

      <p className="mt-10 text-center text-sm text-ink-2">
        {mode === "login" ? "New to Savora? " : "Already have an account? "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="font-medium text-forest-mid underline-offset-4 hover:underline">
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
