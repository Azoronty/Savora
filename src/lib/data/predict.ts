import "server-only";
import { cache } from "react";
import { predictKitchen, type Prediction } from "@/lib/domain/predict";
import { listHistory, listProducts } from "./queries";
import type { Viewer } from "./session";

export type KitchenPrediction = Prediction & { demoKeys: Set<string> };

/** Predictive Kitchen for the viewer's household, computed once per request. */
export const getPrediction = cache(async (viewer: Viewer): Promise<KitchenPrediction> => {
  const [history, products] = await Promise.all([listHistory(viewer), listProducts(viewer)]);
  const prediction = predictKitchen(
    history.map((h) => ({ ...h, quantity: Number(h.quantity) })),
    products.map((p) => ({ ...p, quantity: Number(p.quantity) })),
    viewer.today,
  );
  return { ...prediction, demoKeys: new Set(history.filter((h) => h.is_demo).map((h) => h.item_key)) };
});
