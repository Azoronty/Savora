import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { ShoppingList } from "@/components/shopping/shopping-list";
import { listProducts, listShoppingItems } from "@/lib/data/queries";
import { requireViewer } from "@/lib/data/session";
import { getPrediction } from "@/lib/data/predict";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("Shopping list") };
}

export default async function ShoppingPage() {
  const viewer = await requireViewer();
  const t = await getT();
  const [items, products, prediction] = await Promise.all([listShoppingItems(viewer), listProducts(viewer), getPrediction(viewer)]);
  const open = items.filter((i) => !i.purchased_at).length;

  return (
    <>
      <PageHeader
        eyebrow={t("{n} to buy", { n: open })}
        title="Shopping list"
        description="Savora checks your list against what's already at home, so you buy what you need and nothing twice."
      />
      <ShoppingList
        items={items}
        stock={products.map((p) => ({ name: p.name, expires_on: p.expires_on }))}
        today={viewer.today}
        suggestions={prediction.suggestions}
      />
    </>
  );
}
