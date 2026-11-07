import { describe, expect, it } from "vitest";
import { SaviMotion, type MotionInput } from "../savi-motion";

const still: MotionInput = { vx: 0, vy: 0, airborne: false, crouch: 0, reach: 0, lean: 0, legLength: 0.22 };

describe("Savi motion", () => {
  it("settles to a standing rest pose", () => {
    const m = new SaviMotion();
    m.pose.armL = 1;
    for (let i = 0; i < 240; i++) m.step(still, 1 / 60);
    expect(Math.abs(m.pose.legL)).toBeLessThan(0.01);
    expect(m.restlessness(still)).toBeLessThan(0.05);
    expect(m.bodyY).toBeCloseTo(0, 3);
  });

  it("swings the legs in opposition while walking and lowers the body", () => {
    const m = new SaviMotion();
    const walk = { ...still, vx: 1.5 };
    let opposite = 0;
    let lowest = 0;
    for (let i = 0; i < 120; i++) {
      m.step(walk, 1 / 60);
      if (m.pose.legL * m.pose.legR < -0.01) opposite++;
      lowest = Math.min(lowest, m.bodyY);
    }
    expect(opposite).toBeGreaterThan(60);
    expect(lowest).toBeLessThan(-0.005);
    expect(m.pose.tilt).toBeLessThan(0); // leans into the direction of travel
  });

  it("throws the arms up on a jump and dips on landing", () => {
    const m = new SaviMotion();
    for (let i = 0; i < 30; i++) m.step({ ...still, airborne: true, vy: 1.5 }, 1 / 60);
    expect(m.pose.armL).toBeLessThan(-1.2);
    expect(m.pose.armR).toBeGreaterThan(1.2);
    m.step({ ...still, vy: -1.5 }, 1 / 60);
    for (let i = 0; i < 4; i++) m.step(still, 1 / 60);
    expect(m.pose.dip).toBeLessThan(-0.02);
  });
});
