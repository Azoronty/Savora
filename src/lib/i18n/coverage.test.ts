import { describe, expect, it } from "vitest";
import { RECIPES } from "@/lib/domain/recipes";
import { SAVI_MISSIONS, SAVI_STAGES, SAVI_TOUR, SAVI_XP_RULES } from "@/lib/domain/savi";
import { CATEGORY_LABEL, STORAGE_LABEL, WASTE_REASON_LABEL } from "@/lib/domain/constants";
import { translate } from "./core";

const untranslated = (texts: string[]) => texts.filter((s) => /[A-Za-z]{2}/.test(s) && translate("ru", s) === s);

describe("Russian coverage", () => {
  it("covers every recipe string", () => {
    const texts = RECIPES.flatMap((r) => [r.title, r.summary, ...r.tags, ...r.ingredients.map((i) => i.amount), ...r.staples, ...r.steps]);
    expect(untranslated(texts)).toEqual([]);
  });
  it("covers Savi and labels", () => {
    const texts = [
      ...SAVI_STAGES.flatMap((s) => [s.name, s.blurb]),
      ...SAVI_MISSIONS.flatMap((m) => [m.title, m.detail, m.cta]),
      ...SAVI_XP_RULES.flatMap((r) => [r.action, r.cap]),
      ...SAVI_TOUR.map((s) => s.text),
      ...Object.values(CATEGORY_LABEL),
      ...Object.values(STORAGE_LABEL),
      ...Object.values(WASTE_REASON_LABEL),
    ];
    expect(untranslated(texts)).toEqual([]);
  });
});
