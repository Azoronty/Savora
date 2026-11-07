import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

export const controlClass =
  "w-full h-11 rounded-md border border-line-strong bg-card px-3 text-[0.9375rem] text-ink placeholder:text-muted/80 transition-[border-color,box-shadow] duration-150 hover:border-ink-2/60 focus:border-forest-mid focus:outline-none focus:ring-[3px] focus:ring-forest-mid/15 aria-invalid:border-expired aria-invalid:ring-expired/10 disabled:opacity-60";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label + control + hint/error, wired up with ids for assistive tech. */
export function Field({ id, label, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-ink-2">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[0.8125rem] text-expired">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.8125rem] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(controlClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cx(controlClass, "appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(controlClass, "h-auto min-h-20 py-2.5 leading-relaxed", className)} {...props} />;
}

/** Segmented single-choice control (radio group) for small option sets. */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  label,
}: {
  name: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-ink-2">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-line-strong bg-paper-deep/60 p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cx(
              "flex h-9 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest-mid",
              value === option.value ? "bg-card text-ink shadow-soft" : "text-muted hover:text-ink",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon}
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
