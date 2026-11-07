import { describe, expect, it } from "vitest";
import { AMBIENT_GAP_MS, SAVI_STAGES, reactTo, saviProgress, shouldSpeak, type SpeechState } from "../savi";

const idle: SpeechState = { showingSince: null, showingPriority: null, lastAmbientAt: -Infinity, lastByKey: {} };

describe("Savi progression", () => {
  it("has seven ascending stages starting at 0 XP", () => {
    expect(SAVI_STAGES).toHaveLength(7);
    expect(SAVI_STAGES[0].minXp).toBe(0);
    for (let i = 1; i < SAVI_STAGES.length; i++) expect(SAVI_STAGES[i].minXp).toBeGreaterThan(SAVI_STAGES[i - 1].minXp);
  });

  it("maps XP to stage and progress", () => {
    expect(saviProgress(0)).toMatchObject({ stage: { n: 1 }, xpToNext: 60, fraction: 0 });
    expect(saviProgress(59).stage.n).toBe(1);
    expect(saviProgress(60)).toMatchObject({ stage: { n: 2 }, fraction: 0 });
    expect(saviProgress(110).fraction).toBeCloseTo(0.5);
    expect(saviProgress(5000)).toMatchObject({ stage: { n: 7 }, next: null, fraction: 1, xpToNext: 0 });
    expect(saviProgress(-10).xp).toBe(0);
  });
});

describe("Savi reactions", () => {
  it("names the product it reacts to", () => {
    expect(reactTo({ type: "product_added", name: "carrot" }).text).toBe("Carrot! I'll keep an eye on it.");
  });

  it("celebrates rescues and stays calm about waste", () => {
    expect(reactTo({ type: "product_used", name: "Feta", rescued: true }).animation).toBe("celebrate");
    const waste = reactTo({ type: "product_discarded" });
    expect(waste.text).not.toMatch(/shame|bad|should have/i);
  });

  it("links expiring and recipe lines to real routes", () => {
    expect(reactTo({ type: "expiring", names: ["mushrooms"], count: 3 }).action?.href).toBe("/app/expiring");
    expect(reactTo({ type: "recipe_match", title: "Shakshuka", slug: "shakshuka" }).action?.href).toBe("/app/meals/shakshuka");
  });

  it("never claims food is safe or unsafe", () => {
    const lines = [
      reactTo({ type: "expiring", names: ["milk"], count: 1 }).text,
      reactTo({ type: "product_used", name: "milk", rescued: true }).text,
    ];
    for (const line of lines) expect(line).not.toMatch(/safe|unsafe|dangerous|spoiled/i);
  });
});

describe("Savi speech rate limiting", () => {
  const ambient = reactTo({ type: "expiring", names: ["milk"], count: 1 });
  const event = reactTo({ type: "product_added", name: "milk" });
  const milestone = reactTo({ type: "level_up", stage: SAVI_STAGES[1] });

  it("allows an event bubble when nothing is showing", () => {
    expect(shouldSpeak(event, idle, 0)).toBe(true);
  });

  it("does not stack ambient bubbles or show them too often", () => {
    expect(shouldSpeak(ambient, { ...idle, showingSince: 0, showingPriority: "event" }, 1000)).toBe(false);
    expect(shouldSpeak(ambient, { ...idle, lastAmbientAt: 0 }, AMBIENT_GAP_MS - 1)).toBe(false);
    expect(shouldSpeak(ambient, { ...idle, lastAmbientAt: 0 }, AMBIENT_GAP_MS + 1)).toBe(true);
  });

  it("respects per-key cooldowns", () => {
    expect(shouldSpeak(ambient, { ...idle, lastByKey: { expiring: 0 } }, 60_000)).toBe(false);
  });

  it("lets milestones interrupt, but not the other way round", () => {
    expect(shouldSpeak(milestone, { ...idle, showingSince: 0, showingPriority: "event" }, 10)).toBe(true);
    expect(shouldSpeak(event, { ...idle, showingSince: 0, showingPriority: "milestone" }, 10)).toBe(false);
  });
});
