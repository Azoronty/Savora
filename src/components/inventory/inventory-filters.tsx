"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CATEGORIES, CATEGORY_LABEL, STORAGES, STORAGE_LABEL } from "@/lib/domain/constants";
import { cx } from "@/lib/cx";
import { Select, controlClass } from "@/components/ui/field";
import { Spinner } from "@/components/ui/button";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "soon", label: "Use soon" },
  { value: "expired", label: "Past date" },
  { value: "fresh", label: "Fresh" },
];

/** Filters live in the URL, so views are shareable and the server does the querying. */
export function InventoryFilters({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  const update = (key: string, value: string) => {
    // Read the live URL so quick successive changes never drop each other.
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update("q", q.trim()), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce only on query text
  }, [q]);

  const status = params.get("status") ?? "";
  const hasFilters = ["q", "category", "storage", "status"].some((k) => params.get(k));

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div role="tablist" aria-label="Filter by status" className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {STATUS_TABS.map((tab) => {
          const active = status === tab.value;
          return (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => update("status", tab.value)}
              className={cx(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                active ? "bg-ink text-card" : "text-ink-2 hover:bg-paper-deep",
              )}
            >
              {tab.label}
              <span className={cx("font-mono text-[0.6875rem] tabular", active ? "text-card/70" : "text-muted")}>
                {counts[tab.value || "all"] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_12.5rem]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <label htmlFor="inventory-search" className="sr-only">
            Search products
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="inventory-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your kitchen"
            className={cx(controlClass, "pl-9 pr-9")}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">{pending && <Spinner />}</span>
        </div>
        <FilterSelect label="Category" value={params.get("category") ?? ""} onChange={(v) => update("category", v)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Storage" value={params.get("storage") ?? ""} onChange={(v) => update("storage", v)}>
          <option value="">All storage</option>
          {STORAGES.map((s) => (
            <option key={s} value={s}>
              {STORAGE_LABEL[s]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Sort" value={params.get("sort") ?? "expiry"} onChange={(v) => update("sort", v === "expiry" ? "" : v)}>
          <option value="expiry">Sort: soonest date</option>
          <option value="name">Sort: name A–Z</option>
          <option value="category">Sort: category</option>
          <option value="recent">Sort: recently added</option>
        </FilterSelect>
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="inline-flex items-center gap-1 self-start text-sm text-muted hover:text-ink"
        >
          <X className="size-3.5" aria-hidden="true" /> Clear filters
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="sr-only" htmlFor={`filter-${label}`}>
        {label}
      </label>
      <Select id={`filter-${label}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </Select>
    </div>
  );
}
