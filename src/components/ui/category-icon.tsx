import { Apple, Beef, Carrot, Croissant, CupSoda, Fish, Milk, Package, Wheat, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/domain/constants";
import { cx } from "@/lib/cx";

const ICONS: Record<Category, LucideIcon> = {
  vegetables: Carrot,
  fruits: Apple,
  dairy: Milk,
  meat: Beef,
  fish: Fish,
  grains: Wheat,
  bakery: Croissant,
  drinks: CupSoda,
  other: Package,
};

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = ICONS[category];
  return (
    <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-lg bg-paper-deep text-ink-2", className)}>
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}
