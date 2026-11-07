/**
 * Savi's body mechanics: turns how Savi is moving (speed, height above the
 * ground, crouch) into joint angles, using damped springs so limbs lag,
 * overshoot and settle like real ones. Pure and frame-rate independent;
 * shared by the 3D presentation and the in-app companion.
 *
 * Angles are radians, counter-clockwise positive, 0 = limb hanging straight
 * down. "L" is the limb on the viewer's left.
 */

export type Joint = "armL" | "armR" | "legL" | "legR" | "tilt" | "dip";
export type Pose = Record<Joint, number>;

export type MotionInput = {
  /** Horizontal speed in body heights per second (signed: + = right). */
  vx: number;
  /** Vertical speed in body heights per second (+ = up). */
  vy: number;
  /** True while Savi's feet are off the ground. */
  airborne: boolean;
  /** 0 = standing, 1 = deep crouch (gathering for a jump, absorbing a landing). */
  crouch: number;
  /** 0–1: raise both arms (cheering, stretching up). */
  reach: number;
  /** Extra lean (radians) requested by a choreography, e.g. peering at something. */
  lean: number;
  /** Leg length as a fraction of body height (for keeping the feet planted). */
  legLength: number;
};

const JOINTS: Joint[] = ["armL", "armR", "legL", "legR", "tilt", "dip"];
// Stiffness / damping per joint: under-damped so limbs follow through a little.
const SPRING: Record<Joint, [number, number]> = {
  armL: [170, 13],
  armR: [170, 13],
  legL: [260, 22],
  legR: [260, 22],
  tilt: [120, 13],
  dip: [320, 16],
};
const STRIDE = 0.9; // body heights per full step cycle

const zero = (): Pose => ({ armL: 0, armR: 0, legL: 0, legR: 0, tilt: 0, dip: 0 });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class SaviMotion {
  pose = zero();
  private vel = zero();
  private phase = 0;
  private wasAirborne = false;
  /** Vertical offset of the body (body heights, negative = lower), keeping feet on the ground. */
  bodyY = 0;

  /** Where each joint wants to be right now. */
  targets(i: MotionInput): Pose {
    const speed = Math.abs(i.vx);
    const gait = clamp(speed / 1.6, 0, 1);
    const swing = Math.sin(this.phase);
    const t = zero();
    t.tilt = clamp(-i.vx * 0.06, -0.22, 0.22) + i.lean;
    if (i.airborne) {
      // Going up: arms fling up and out, legs trail. Coming down: arms out for balance, legs reach for the ground.
      const up = clamp(i.vy * 0.8, -1, 1);
      const arms = up > 0 ? 1.2 + 1.1 * up : 1.25;
      t.armL = -arms;
      t.armR = arms;
      t.legL = up > 0 ? -0.28 : -0.08;
      t.legR = up > 0 ? 0.28 : 0.08;
    } else {
      // Walking: legs swing in opposition, arms counter-swing; a crouch splays the legs (knees out).
      const legSwing = swing * (0.2 + 0.45 * gait) * (gait > 0.04 ? 1 : 0);
      t.legL = legSwing - i.crouch * 0.55;
      t.legR = -legSwing + i.crouch * 0.55;
      const armSwing = swing * 0.75 * gait;
      t.armL = -armSwing - 0.08 - i.crouch * 0.5;
      t.armR = -armSwing + 0.08 + i.crouch * 0.5;
    }
    t.armL -= i.reach * 2.3;
    t.armR += i.reach * 2.3;
    return t;
  }

  step(i: MotionInput, dt: number): Pose {
    dt = Math.min(dt, 0.1);
    // Step cycle advances with distance travelled, so feet don't skate.
    this.phase += ((Math.abs(i.vx) * dt) / STRIDE) * Math.PI * 2;
    if (this.wasAirborne && !i.airborne) {
      // Landing: the body drops with the impact and the arms are thrown by it.
      this.vel.dip -= 2.2 + Math.abs(i.vy) * 0.6;
      this.vel.armL -= 4;
      this.vel.armR += 4;
    }
    this.wasAirborne = i.airborne;
    const target = this.targets(i);
    for (let left = dt; left > 1e-6; left -= 1 / 120) {
      const h = Math.min(left, 1 / 120);
      for (const j of JOINTS) {
        const [k, c] = SPRING[j];
        const a = k * (target[j] - this.pose[j]) - c * this.vel[j];
        this.vel[j] += a * h;
        this.pose[j] += this.vel[j] * h;
      }
    }
    // Feet stay planted: spreading the legs lowers the body (inverted pendulum).
    const spread = Math.max(Math.abs(this.pose.legL), Math.abs(this.pose.legR));
    this.bodyY = (i.airborne ? 0 : -i.legLength * (1 - Math.cos(spread))) + Math.min(0, this.pose.dip) * 0.12;
    return this.pose;
  }

  /** How far from rest the springs still are; ~0 once everything has settled. */
  restlessness(i: MotionInput): number {
    const t = this.targets(i);
    return JOINTS.reduce((s, j) => s + Math.abs(this.vel[j]) + Math.abs(t[j] - this.pose[j]), 0);
  }
}
