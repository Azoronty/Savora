import rigData from "./rig.json";

/** Savi's cut-out rig: body + limbs per stage, with joint positions in body pixels. */
export type RigPart = { w: number; h: number; px: number; py: number; jx: number; jy: number; layer: "front" | "back"; rest: number };
export type StageRig = { body: { w: number; h: number }; parts: Partial<Record<"armL" | "armR" | "legL" | "legR", RigPart>> };

export const RIG = rigData as unknown as Record<string, StageRig>;
export const LIMBS = ["legL", "legR", "armL", "armR"] as const;
export type Limb = (typeof LIMBS)[number];

export const rigSrc = (stage: number, part: Limb | "body") => `/savi/rig/s${stage}-${part}.webp`;

export function stageRig(stage: number): StageRig {
  return RIG[String(Math.min(7, Math.max(1, stage)))];
}

/** Lowest point of the feet in body pixels (the figure's ground line). */
export function feetY(r: StageRig): number {
  let y = r.body.h;
  for (const p of Object.values(r.parts)) if (p && p.layer === "back") y = Math.max(y, p.jy - p.py + p.h);
  return y;
}

/** Leg length as a fraction of the figure height. */
export function legLength(r: StageRig): number {
  const leg = r.parts.legL;
  return leg ? (leg.h - leg.py) / feetY(r) : 0.2;
}
