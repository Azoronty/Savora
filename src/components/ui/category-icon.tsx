import {
  Amphora, Apple, Avocado, Banana, Bean, Beef, Carrot, Cherry, Citrus, Coffee, Croissant, CupSoda, Cylinder, Droplet,
  Drumstick, Egg, Fish, Grape, Ham, Leaf, LeafyGreen, Milk, Nut, Package, Salad, Sandwich, Shrimp, Soup, Vegan, Wheat,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/domain/constants";
import { matchCatalog } from "@/lib/domain/catalog";
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

// A food's own icon where one exists (catalog key → icon); otherwise its category's.
const FOOD_ICONS: Record<string, LucideIcon> = {
  tomato: Cherry, spinach: LeafyGreen, lettuce: LeafyGreen, cabbage: LeafyGreen, celery: LeafyGreen, cucumber: Salad,
  broccoli: Salad, avocado: Avocado, parsley: Leaf, basil: Leaf, cilantro: Leaf, dill: Leaf, "spring onion": Leaf,
  peas: Bean, "green beans": Bean, corn: Wheat,
  apple: Apple, pear: Apple, mango: Apple, banana: Banana, lemon: Citrus, lime: Citrus, orange: Citrus, berries: Cherry, grapes: Grape,
  milk: Milk, kefir: Milk, yogurt: Milk, egg: Egg, cream: Droplet, butter: Cylinder, cheese: Cylinder, mozzarella: Cylinder,
  feta: Cylinder, "cream cheese": Cylinder, "cottage cheese": Cylinder,
  chicken: Drumstick, turkey: Drumstick, beef: Beef, "ground beef": Beef, pork: Beef, bacon: Ham, ham: Ham, sausage: Ham,
  salmon: Fish, "white fish": Fish, tuna: Fish, shrimp: Shrimp,
  rice: Wheat, oats: Wheat, flour: Wheat, quinoa: Wheat, couscous: Wheat, buckwheat: Wheat, pasta: Soup, noodles: Soup,
  lentils: Bean, chickpeas: Bean, beans: Bean,
  bread: Sandwich, tortilla: Sandwich, pita: Sandwich,
  "orange juice": CupSoda, coffee: Coffee, tea: Coffee,
  "canned tomatoes": Cylinder, "tomato paste": Cylinder, "coconut milk": Cylinder, tofu: Vegan, hummus: Bean, pesto: Leaf,
  stock: Soup, "soy sauce": Droplet, honey: Amphora, "peanut butter": Nut,
};

const TINT: Record<Category, string> = {
  vegetables: "bg-forest-wash text-forest-mid",
  fruits: "bg-saffron-soft text-soon",
  dairy: "bg-paper-deep text-ink-2",
  meat: "bg-expired-soft text-expired",
  fish: "bg-forest-soft text-forest",
  grains: "bg-saffron-soft/70 text-soon",
  bakery: "bg-saffron-soft text-soon",
  drinks: "bg-paper-deep text-ink-2",
  other: "bg-paper-deep text-ink-2",
};

export function CategoryIcon({ category, name, className }: { category: Category; name?: string; className?: string }) {
  const key = name ? matchCatalog(name)?.key : undefined;
  const Icon = (key && FOOD_ICONS[key]) || ICONS[category];
  return (
    <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-lg", TINT[category], className)}>
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}
