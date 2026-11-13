"use client";

import { Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { deleteWasteRecord, logWaste } from "@/lib/actions/waste";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  UNITS,
  UNIT_LABEL,
  WASTE_REASONS,
  WASTE_REASON_LABEL,
  type Category,
  type Unit,
  type WasteReason,
} from "@/lib/domain/constants";
import { matchCatalog } from "@/lib/domain/catalog";
import { formatShortDate } from "@/lib/domain/dates";
import { formatMoney, formatQuantity, parseMoneyToCents } from "@/lib/domain/format";
import type { WasteRecord } from "@/lib/data/queries";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, describedBy } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useAction } from "@/components/ui/toast";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useLang, useT } from "@/components/i18n/lang-provider";
import { SampleTag } from "@/components/inventory/product-row";

export function LogWasteButton({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" /> {t("Log thrown-away food")}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Log thrown-away food" description="For things that weren't tracked in your inventory. For tracked items, use “Throw away” on the item itself.">
        {open && <LogWasteForm today={today} onDone={() => setOpen(false)} />}
      </Sheet>
    </>
  );
}

function LogWasteForm({ today, onDone }: { today: string; onDone: () => void }) {
  const uid = useId();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<Unit>("pcs");
  const [category, setCategory] = useState<Category>("other");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [reason, setReason] = useState<WasteReason>("spoiled");
  const [date, setDate] = useState(today);
  const [cost, setCost] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, pending } = useAction();
  const t = useT();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseMoneyToCents(cost);
    if (Number.isNaN(cents)) return setErrors({ cost_cents: t("Enter an amount like 2.50") });
    const r = await run(() =>
      logWaste({ product_name: name, quantity, unit, category, reason, discarded_on: date, cost_cents: cents }),
    );
    if (r.ok) onDone();
    else setErrors(r.fieldErrors ?? {});
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field id={`${uid}-name`} label="What was it?" error={errors.product_name}>
        <Input
          id={`${uid}-name`}
          value={name}
          autoFocus
          maxLength={80}
          placeholder={t("e.g. Half a bag of salad")}
          aria-invalid={Boolean(errors.product_name) || undefined}
          aria-describedby={describedBy(`${uid}-name`, errors.product_name)}
          onChange={(e) => {
            setName(e.target.value);
            const entry = matchCatalog(e.target.value);
            if (entry && !categoryTouched) setCategory(entry.category);
          }}
        />
      </Field>
      <div className="grid grid-cols-[1fr_7.5rem] gap-3">
        <Field id={`${uid}-qty`} label="Quantity" error={errors.quantity}>
          <Input id={`${uid}-qty`} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="tabular" aria-invalid={Boolean(errors.quantity) || undefined} />
        </Field>
        <Field id={`${uid}-unit`} label="Unit">
          <Select id={`${uid}-unit`} value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(UNIT_LABEL[u])}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id={`${uid}-cat`} label="Category">
        <Select
          id={`${uid}-cat`}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as Category);
            setCategoryTouched(true);
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(CATEGORY_LABEL[c])}
            </option>
          ))}
        </Select>
      </Field>
      <Field id={`${uid}-reason`} label="Reason">
        <Select id={`${uid}-reason`} value={reason} onChange={(e) => setReason(e.target.value as WasteReason)}>
          {WASTE_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(WASTE_REASON_LABEL[r])}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id={`${uid}-date`} label="Date" error={errors.discarded_on}>
          <Input id={`${uid}-date`} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field id={`${uid}-cost`} label="Cost" optional error={errors.cost_cents}>
          <Input id={`${uid}-cost`} inputMode="decimal" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} className="tabular" />
        </Field>
      </div>
      <Button type="submit" pending={pending} className="mt-1">
        {t("Add to waste log")}
      </Button>
    </form>
  );
}

export function WasteLogList({ records }: { records: WasteRecord[] }) {
  const { run } = useAction();
  const t = useT();
  const lang = useLang();
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
      {records.map((r) => (
        <li key={r.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          <CategoryIcon category={r.category} name={r.product_name} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2">
              <span className="truncate font-medium">{t(r.product_name)}</span>
              {r.is_demo && <SampleTag />}
            </p>
            <p className="text-[0.8125rem] text-muted">
              {t(formatQuantity(Number(r.quantity), r.unit))} · {t(WASTE_REASON_LABEL[r.reason])}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[0.8125rem] tabular">{formatShortDate(r.discarded_on, lang)}</p>
            <p className="text-[0.8125rem] text-muted tabular">{r.cost_cents !== null ? formatMoney(r.cost_cents, lang) : t("No price")}</p>
          </div>
          <button
            type="button"
            onClick={() => run(() => deleteWasteRecord(r.id))}
            aria-label={t("Delete record for {name}", { name: t(r.product_name) })}
            className="-mr-2 inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-paper-deep hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
