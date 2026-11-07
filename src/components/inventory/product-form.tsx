"use client";

import { ChevronDown, Refrigerator, Snowflake, Archive } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { createProduct, updateProduct } from "@/lib/actions/products";
import {
  matchCatalog,
  searchCatalog,
  suggestedShelfDays,
  type CatalogEntry,
} from "@/lib/domain/catalog";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  STORAGE_LABEL,
  UNITS,
  UNIT_LABEL,
  type Category,
  type Storage,
  type Unit,
} from "@/lib/domain/constants";
import { addDays, formatShortDate } from "@/lib/domain/dates";
import { centsToInput, parseMoneyToCents } from "@/lib/domain/format";
import type { Product } from "@/lib/data/queries";
import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select, Textarea, controlClass, describedBy } from "@/components/ui/field";
import { useAction } from "@/components/ui/toast";
import { useSavi } from "@/components/savi/savi-companion";

export type ProductPrefill = Partial<Pick<Product, "name" | "quantity" | "unit" | "category" | "storage">>;

type FormState = {
  name: string;
  quantity: string;
  unit: Unit;
  category: Category;
  storage: Storage;
  expires_on: string;
  purchased_on: string;
  price: string;
  notes: string;
};

const STORAGE_OPTIONS = [
  { value: "fridge" as const, label: "Fridge", icon: <Refrigerator className="size-4" aria-hidden="true" /> },
  { value: "freezer" as const, label: "Freezer", icon: <Snowflake className="size-4" aria-hidden="true" /> },
  { value: "pantry" as const, label: "Pantry", icon: <Archive className="size-4" aria-hidden="true" /> },
];

const QUICK_DATES = [
  { label: "+3 days", days: 3 },
  { label: "+1 week", days: 7 },
  { label: "+2 weeks", days: 14 },
  { label: "+1 month", days: 30 },
];

function initialState(today: string, product?: Product, prefill?: ProductPrefill): FormState {
  if (product) {
    return {
      name: product.name,
      quantity: String(product.quantity),
      unit: product.unit,
      category: product.category,
      storage: product.storage,
      expires_on: product.expires_on,
      purchased_on: product.purchased_on ?? "",
      price: centsToInput(product.price_cents),
      notes: product.notes ?? "",
    };
  }
  const entry = prefill?.name ? matchCatalog(prefill.name) : undefined;
  const storage = prefill?.storage ?? entry?.storage ?? "fridge";
  return {
    name: prefill?.name ?? "",
    quantity: String(prefill?.quantity ?? entry?.quantity ?? 1),
    unit: prefill?.unit ?? entry?.unit ?? "pcs",
    category: prefill?.category ?? entry?.category ?? "other",
    storage,
    expires_on: entry ? addDays(today, suggestedShelfDays(entry, storage)) : addDays(today, 7),
    purchased_on: today,
    price: "",
    notes: "",
  };
}

type Props = {
  today: string;
  product?: Product;
  prefill?: ProductPrefill;
  onDone: () => void;
};

export function ProductForm({ today, product, prefill, onDone }: Props) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const [form, setForm] = useState<FormState>(() => initialState(today, product, prefill));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<keyof FormState>>(() => new Set(product ? ["expires_on", "category", "unit", "quantity", "storage"] : []));
  const [showMore, setShowMore] = useState(Boolean(product?.price_cents || product?.notes));
  const [suggestion, setSuggestion] = useState<CatalogEntry | undefined>(() =>
    !product && prefill?.name ? matchCatalog(prefill.name) : undefined,
  );
  const { run, pending } = useAction();
  const savi = useSavi();
  const addAnother = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Combobox state
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const options = useMemo(() => (listOpen ? searchCatalog(form.name) : []), [form.name, listOpen]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K], manual = true) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (manual) setTouched((t) => new Set(t).add(key));
    if (errors[key]) setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  /** Fill defaults from a recognised food without overriding what the user changed. */
  const applyEntry = (entry: CatalogEntry, storageOverride?: Storage) => {
    setSuggestion(entry);
    setForm((f) => {
      const storage = storageOverride ?? (touched.has("storage") ? f.storage : entry.storage);
      return {
        ...f,
        storage,
        category: touched.has("category") ? f.category : entry.category,
        unit: touched.has("unit") ? f.unit : entry.unit,
        quantity: touched.has("quantity") ? f.quantity : String(entry.quantity),
        expires_on: touched.has("expires_on") ? f.expires_on : addDays(today, suggestedShelfDays(entry, storage)),
      };
    });
  };

  const choose = (entry: CatalogEntry) => {
    const keepTyped = form.name.trim().length > entry.label.length && matchCatalog(form.name)?.key === entry.key;
    if (!keepTyped) set("name", entry.label);
    applyEntry(entry);
    setListOpen(false);
    setActive(-1);
  };

  const onNameBlur = () => {
    setTimeout(() => setListOpen(false), 120);
    if (product) return;
    const entry = matchCatalog(form.name);
    if (entry && entry.key !== suggestion?.key) applyEntry(entry);
  };

  const onStorageChange = (storage: Storage) => {
    set("storage", storage);
    const entry = suggestion ?? matchCatalog(form.name);
    if (entry && !touched.has("expires_on") && !product) {
      setForm((f) => ({ ...f, storage, expires_on: addDays(today, suggestedShelfDays(entry, storage)) }));
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const priceCents = parseMoneyToCents(form.price);
    if (Number.isNaN(priceCents)) {
      setErrors({ price_cents: "Enter a price like 3.49" });
      return;
    }
    const values = {
      name: form.name,
      quantity: form.quantity,
      unit: form.unit,
      category: form.category,
      storage: form.storage,
      expires_on: form.expires_on,
      purchased_on: form.purchased_on || null,
      price_cents: priceCents,
      notes: form.notes || null,
    };
    const result = await run<unknown>(() => (product ? updateProduct(product.id, values) : createProduct(values)));
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      return;
    }
    if (!product) savi({ type: "product_added", name: form.name.trim() });
    if (addAnother.current && !product) {
      addAnother.current = false;
      setForm(initialState(today));
      setTouched(new Set());
      setSuggestion(undefined);
      setErrors({});
      nameRef.current?.focus();
      return;
    }
    onDone();
  };

  const expiryHint = (() => {
    if (touched.has("expires_on") || product) return "Use the date printed on the package.";
    const entry = suggestion;
    if (!entry) return "Pre-filled one week out. Use the date printed on the package.";
    return `Typical for ${entry.label.toLowerCase()} in the ${STORAGE_LABEL[form.storage].toLowerCase()}. Check the package date.`;
  })();

  const listId = id("suggestions");

  return (
    <form id="product-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
      {/* Name with catalog autocomplete (ARIA combobox) */}
      <Field id={id("name")} label="What is it?" error={errors.name}>
        <div className="relative">
          <input
            ref={nameRef}
            id={id("name")}
            className={controlClass}
            value={form.name}
            autoFocus={!product}
            autoComplete="off"
            placeholder="e.g. Baby spinach"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={describedBy(id("name"), errors.name)}
            maxLength={80}
            onChange={(e) => {
              set("name", e.target.value);
              setListOpen(true);
              setActive(-1);
            }}
            onFocus={() => setListOpen(true)}
            onBlur={onNameBlur}
            onKeyDown={(e) => {
              if (!options.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => (a + 1) % options.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
              } else if (e.key === "Enter" && active >= 0) {
                e.preventDefault();
                choose(options[active]);
              } else if (e.key === "Escape") {
                setListOpen(false);
              }
            }}
          />
          {options.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Suggestions"
              className="absolute inset-x-0 top-full z-10 mt-1.5 overflow-hidden rounded-lg border border-line bg-card py-1 shadow-lift animate-fade"
            >
              {options.map((entry, i) => (
                <li
                  key={entry.key}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(entry);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cx(
                    "flex cursor-pointer items-center justify-between px-3 py-2.5 text-[0.9375rem]",
                    i === active && "bg-forest-wash",
                  )}
                >
                  <span>{entry.label}</span>
                  <span className="text-xs text-muted">
                    {CATEGORY_LABEL[entry.category]} · {STORAGE_LABEL[entry.storage]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      <div className="grid grid-cols-[1fr_7.5rem] gap-3">
        <Field id={id("quantity")} label="Quantity" error={errors.quantity}>
          <Input
            id={id("quantity")}
            inputMode="decimal"
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            aria-invalid={Boolean(errors.quantity) || undefined}
            aria-describedby={describedBy(id("quantity"), errors.quantity)}
            className="tabular"
          />
        </Field>
        <Field id={id("unit")} label="Unit">
          <Select id={id("unit")} value={form.unit} onChange={(e) => set("unit", e.target.value as Unit)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABEL[u]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Segmented name={id("storage")} label="Stored in" value={form.storage} options={STORAGE_OPTIONS} onChange={onStorageChange} />

      <Field id={id("expires")} label="Use-by / best-before date" error={errors.expires_on} hint={expiryHint}>
        <Input
          id={id("expires")}
          type="date"
          value={form.expires_on}
          onChange={(e) => set("expires_on", e.target.value)}
          aria-invalid={Boolean(errors.expires_on) || undefined}
          aria-describedby={describedBy(id("expires"), errors.expires_on, expiryHint)}
          required
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick date">
          {QUICK_DATES.map((q) => {
            const value = addDays(today, q.days);
            return (
              <button
                key={q.days}
                type="button"
                onClick={() => set("expires_on", value)}
                aria-pressed={form.expires_on === value}
                title={formatShortDate(value)}
                className={cx(
                  "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                  form.expires_on === value
                    ? "border-forest bg-forest text-card"
                    : "border-line-strong text-ink-2 hover:border-ink-2",
                )}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field id={id("category")} label="Category">
        <Select id={id("category")} value={form.category} onChange={(e) => set("category", e.target.value as Category)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          aria-expanded={showMore}
          className="flex w-full items-center justify-between rounded-md py-1 text-sm font-medium text-ink-2 hover:text-ink"
        >
          Purchase date, price and notes
          <ChevronDown className={cx("size-4 transition-transform", showMore && "rotate-180")} aria-hidden="true" />
        </button>
        {showMore && (
          <div className="mt-4 flex flex-col gap-5 animate-fade">
            <div className="grid grid-cols-2 gap-3">
              <Field id={id("purchased")} label="Bought on" optional error={errors.purchased_on}>
                <Input
                  id={id("purchased")}
                  type="date"
                  value={form.purchased_on}
                  max={today}
                  onChange={(e) => set("purchased_on", e.target.value)}
                />
              </Field>
              <Field id={id("price")} label="Price" optional error={errors.price_cents}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <Input
                    id={id("price")}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    aria-invalid={Boolean(errors.price_cents) || undefined}
                    className="tabular pl-7"
                  />
                </div>
              </Field>
            </div>
            <Field id={id("notes")} label="Notes" optional error={errors.notes}>
              <Textarea
                id={id("notes")}
                value={form.notes}
                maxLength={500}
                placeholder="Opened on Monday, top shelf…"
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {!product && (
          <Button
            type="submit"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              addAnother.current = true;
            }}
          >
            Save &amp; add another
          </Button>
        )}
        <Button type="submit" pending={pending}>
          {product ? "Save changes" : "Add to inventory"}
        </Button>
      </div>
    </form>
  );
}
