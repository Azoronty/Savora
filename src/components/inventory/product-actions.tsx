"use client";

import { Check, Ellipsis, Pencil, Trash, Recycle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { consumeProduct, deleteProduct, discardProduct } from "@/lib/actions/products";
import { UNIT_LABEL, WASTE_REASONS, WASTE_REASON_LABEL, type WasteReason } from "@/lib/domain/constants";
import { formatMoney, formatQuantity } from "@/lib/domain/format";
import type { Product } from "@/lib/data/queries";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { Field, Input, describedBy } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useAction } from "@/components/ui/toast";
import { useProductSheet } from "@/components/app/product-sheet";
import { useSavi } from "@/components/savi/savi-companion";
import { useLang, useT } from "@/components/i18n/lang-provider";
import { daysBetween } from "@/lib/domain/dates";

/** A use within the use-soon window counts as a rescue (mirrors the database rule). */
const isRescue = (expiresOn: string, today: string) => {
  const d = daysBetween(today, expiresOn);
  return d >= 0 && d <= 3;
};

type Mode = "use" | "discard" | "delete" | null;

export function ProductActions({ product, today, compact = false }: { product: Product; today: string; compact?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const { openEdit } = useProductSheet();
  const menuRef = useRef<HTMLDivElement>(null);
  const { run, pending } = useAction();
  const t = useT();
  const savi = useSavi();

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  const pick = (next: Mode | "edit") => {
    setMenuOpen(false);
    if (next === "edit") openEdit(product);
    else setMode(next);
  };

  return (
    <div className="flex items-center gap-1">
      {!compact && (
        <span className="hidden sm:block">
          <Button
            variant="secondary"
            size="sm"
            pending={pending}
            onClick={async () => {
              const r = await run(() => consumeProduct(product.id, Number(product.quantity)));
              if (r.ok) savi({ type: "product_used", name: product.name, rescued: isRescue(product.expires_on, today) });
            }}
            aria-label={t("Mark all {name} as used", { name: t(product.name) })}
          >
            <Check className="size-4" aria-hidden="true" /> <span className="max-xl:hidden">{t("Used")}</span>
          </Button>
        </span>
      )}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label={t("More actions for {name}", { name: t(product.name) })}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex size-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <Ellipsis className="size-5" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-lg border border-line bg-card py-1.5 shadow-lift animate-fade"
          >
            <MenuItem icon={<Check />} onClick={() => pick("use")}>
              {t("Mark as used…")}
            </MenuItem>
            <MenuItem icon={<Recycle />} onClick={() => pick("discard")}>
              {t("Throw away…")}
            </MenuItem>
            <MenuItem icon={<Pencil />} onClick={() => pick("edit")}>
              {t("Edit details")}
            </MenuItem>
            <div className="my-1.5 border-t border-line" />
            <MenuItem icon={<Trash />} danger onClick={() => pick("delete")}>
              {t("Delete")}
            </MenuItem>
          </div>
        )}
      </div>

      <UseSheet product={product} today={today} open={mode === "use"} onClose={() => setMode(null)} />
      <DiscardSheet product={product} today={today} open={mode === "discard"} onClose={() => setMode(null)} />
      <Sheet
        open={mode === "delete"}
        onClose={() => setMode(null)}
        title="Delete this product?"
        description="Deleting removes it without recording waste. Use “Throw away” if it's going in the bin."
        footer={
          <>
            <Button variant="secondary" onClick={() => setMode(null)}>
              {t("Cancel")}
            </Button>
            <Button
              variant="danger"
              pending={pending}
              onClick={async () => {
                const r = await run(() => deleteProduct(product.id));
                if (r.ok) setMode(null);
              }}
            >
              {t("Delete")} {t(product.name)}
            </Button>
          </>
        }
      >
        <p className="text-[0.9375rem] text-ink-2">
          <strong className="font-medium text-ink">{t(product.name)}</strong> · {t(formatQuantity(Number(product.quantity), product.unit))}
        </p>
      </Sheet>
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ReactElement<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-paper-deep [&_svg]:size-4",
        danger ? "text-expired" : "text-ink-2 hover:text-ink",
      )}
    >
      <span aria-hidden="true" className={danger ? "" : "text-muted"}>
        {icon}
      </span>
      {children}
    </button>
  );
}

/** Shared "how much?" control: all of it, or a specific amount. */
function useAmount(product: Product) {
  const total = Number(product.quantity);
  const [all, setAll] = useState(true);
  const [value, setValue] = useState(String(total));
  const amount = all ? total : Number(value.replace(",", "."));
  const valid = Number.isFinite(amount) && amount > 0 && amount <= total;
  return { total, all, setAll, value, setValue, amount, valid };
}

function AmountPicker({ product, state, idPrefix }: { product: Product; state: ReturnType<typeof useAmount>; idPrefix: string }) {
  const t = useT();
  const error = !state.all && !state.valid ? t("Enter an amount up to {max}", { max: t(formatQuantity(state.total, product.unit)) }) : undefined;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("How much")}>
        {[
          { all: true, label: t("All of it"), sub: t(formatQuantity(state.total, product.unit)) },
          { all: false, label: t("Some of it"), sub: t("Enter an amount") },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={state.all === opt.all}
            onClick={() => state.setAll(opt.all)}
            className={cx(
              "rounded-lg border p-3 text-left transition-colors",
              state.all === opt.all ? "border-forest bg-forest-wash" : "border-line-strong hover:border-ink-2",
            )}
          >
            <span className="block text-sm font-medium">{opt.label}</span>
            <span className="block text-xs text-muted">{opt.sub}</span>
          </button>
        ))}
      </div>
      {!state.all && (
        <Field id={`${idPrefix}-amount`} label={t("Amount ({unit})", { unit: t(UNIT_LABEL[product.unit]) })} error={error}>
          <Input
            id={`${idPrefix}-amount`}
            inputMode="decimal"
            autoFocus
            value={state.value}
            onChange={(e) => state.setValue(e.target.value)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(`${idPrefix}-amount`, error)}
            className="tabular"
          />
        </Field>
      )}
    </div>
  );
}

function UseSheet({ product, today, open, onClose }: { product: Product; today: string; open: boolean; onClose: () => void }) {
  const amount = useAmount(product);
  const { run, pending } = useAction();
  const t = useT();
  const savi = useSavi();
  const id = useId();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Mark as used"
      description={t("{name} · {qty} in stock", { name: t(product.name), qty: t(formatQuantity(amount.total, product.unit)) })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            pending={pending}
            disabled={!amount.valid}
            onClick={async () => {
              const r = await run(() => consumeProduct(product.id, amount.amount));
              if (r.ok) {
                onClose();
                savi({ type: "product_used", name: product.name, rescued: isRescue(product.expires_on, today) });
              }
            }}
          >
            {t("Mark as used")}
          </Button>
        </>
      }
    >
      <AmountPicker product={product} state={amount} idPrefix={id} />
    </Sheet>
  );
}

function DiscardSheet({ product, today, open, onClose }: { product: Product; today: string; open: boolean; onClose: () => void }) {
  const lang = useLang();
  const amount = useAmount(product);
  const [reason, setReason] = useState<WasteReason>(product.expires_on < today ? "expired" : "spoiled");
  const [date, setDate] = useState(today);
  const { run, pending } = useAction();
  const t = useT();
  const savi = useSavi();
  const id = useId();
  const cost =
    product.price_cents !== null && amount.valid ? Math.round((product.price_cents * amount.amount) / amount.total) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Throw away"
      description="Recording what gets thrown away shows where waste comes from."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            pending={pending}
            disabled={!amount.valid}
            onClick={async () => {
              const r = await run(() =>
                discardProduct({ id: product.id, quantity: amount.amount, reason, discarded_on: date }),
              );
              if (r.ok) {
                onClose();
                savi({ type: "product_discarded" });
              }
            }}
          >
            {t("Log & remove")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <p className="text-[0.9375rem]">
          <strong className="font-medium">{t(product.name)}</strong>
          <span className="text-muted"> · {t(formatQuantity(amount.total, product.unit))}</span>
        </p>
        <AmountPicker product={product} state={amount} idPrefix={id} />
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-2">{t("Why is it going?")}</legend>
          <div className="flex flex-wrap gap-2">
            {WASTE_REASONS.map((r) => (
              <label
                key={r}
                className={cx(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest-mid",
                  reason === r ? "border-forest bg-forest text-card" : "border-line-strong text-ink-2 hover:border-ink-2",
                )}
              >
                <input type="radio" name={`${id}-reason`} value={r} checked={reason === r} onChange={() => setReason(r)} className="sr-only" />
                {t(WASTE_REASON_LABEL[r])}
              </label>
            ))}
          </div>
        </fieldset>
        <Field id={`${id}-date`} label="Thrown away on">
          <Input id={`${id}-date`} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {cost !== null && (
          <p className="rounded-lg bg-paper-deep/70 px-4 py-3 text-sm text-ink-2">
            {t("Logged value:")} <strong className="font-medium tabular text-ink">{formatMoney(cost, lang)}</strong>{t(", based on the price you entered.")}
          </p>
        )}
      </div>
    </Sheet>
  );
}
