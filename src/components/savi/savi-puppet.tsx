"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { SaviMotion, type MotionInput } from "@/lib/domain/savi-motion";
import { LIMBS, feetY, legLength, rigSrc, stageRig, type Limb } from "./rig";

/** What animations can ask of Savi's body; tween these values, then call wake(). */
export type PuppetDrive = { crouch: number; reach: number; lean: number; airborne: boolean };
export type PuppetHandle = { drive: PuppetDrive; wake: () => void };

/**
 * Savi as a DOM cut-out puppet: body and limbs as separate images, each limb
 * rotating about its joint, driven by spring physics from how fast the
 * character is moving. The animation loop runs only while something moves.
 */
export const SaviPuppet = forwardRef<
  PuppetHandle,
  { stage: number; height: number; facing: () => number; position: () => { x: number; y: number }; still?: boolean; className?: string }
>(function SaviPuppet({ stage, height, facing, position, still = false, className }, ref) {
  const rig = stageRig(stage);
  const k = height / feetY(rig);
  const limbs = LIMBS.filter((l) => rig.parts[l]);
  const els = useRef<Partial<Record<Limb | "body" | "root", HTMLElement | null>>>({});
  const drive = useRef<PuppetDrive>({ crouch: 0, reach: 0, lean: 0, airborne: false });
  const motion = useRef(new SaviMotion());
  const frame = useRef<number | null>(null);
  const awakeUntil = useRef(0);
  const last = useRef<{ t: number; x: number; y: number } | null>(null);

  const tick = useCallback(() => {
    const now = performance.now();
    const p = position();
    const prev = last.current ?? { t: now - 16, ...p };
    last.current = { t: now, ...p };
    const dt = Math.min(0.1, Math.max(0.001, (now - prev.t) / 1000));
    const d = drive.current;
    const input: MotionInput = {
      vx: (((p.x - prev.x) / dt) * facing()) / height,
      vy: -((p.y - prev.y) / dt) / height,
      airborne: d.airborne,
      crouch: d.crouch,
      reach: d.reach,
      lean: d.lean,
      legLength: legLength(rig),
    };
    const m = motion.current;
    const pose = m.step(input, dt);
    for (const l of limbs) {
      const el = els.current[l];
      if (el) el.style.rotate = `${-(rig.parts[l]!.rest + pose[l])}rad`; // CSS rotates clockwise
    }
    if (els.current.body) els.current.body.style.translate = `0 ${-m.bodyY * height}px`;
    if (els.current.root) els.current.root.style.rotate = `${-pose.tilt}rad`;
    const moving = Math.abs(input.vx) + Math.abs(input.vy) > 0.02;
    if (moving || d.airborne || m.restlessness(input) > 0.02 || now < awakeUntil.current) frame.current = requestAnimationFrame(tick);
    else {
      frame.current = null;
      last.current = null;
    }
  }, [facing, height, limbs, position, rig]);

  const wake = useCallback(() => {
    if (still) return;
    awakeUntil.current = performance.now() + 250;
    if (frame.current === null) frame.current = requestAnimationFrame(tick);
  }, [still, tick]);

  useImperativeHandle(ref, () => ({ drive: drive.current, wake }), [wake]);
  useEffect(() => () => void (frame.current !== null && cancelAnimationFrame(frame.current)), []);

  const part = (l: Limb) => {
    const p = rig.parts[l]!;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small pre-sized rig part, animated by transforms
      <img
        key={`${stage}-${l}`}
        ref={(el) => void (els.current[l] = el)}
        src={rigSrc(stage, l)}
        alt=""
        draggable={false}
        className="absolute max-w-none"
        style={{
          left: (p.jx - p.px) * k,
          top: (p.jy - p.py) * k,
          width: p.w * k,
          height: p.h * k,
          transformOrigin: `${p.px * k}px ${p.py * k}px`,
          rotate: `${-p.rest}rad`,
        }}
      />
    );
  };

  return (
    <span ref={(el) => void (els.current.root = el)} className={className} style={{ display: "block", position: "relative", width: rig.body.w * k, height, transformOrigin: "50% 100%" }}>
      <span ref={(el) => void (els.current.body = el)} className="absolute inset-0">
        {limbs.filter((l) => rig.parts[l]!.layer === "back").map(part)}
        {/* eslint-disable-next-line @next/next/no-img-element -- small pre-sized rig part */}
        <img src={rigSrc(stage, "body")} alt="" draggable={false} className="absolute left-0 top-0 max-w-none" style={{ width: rig.body.w * k, height: rig.body.h * k }} />
        {limbs.filter((l) => rig.parts[l]!.layer === "front").map(part)}
      </span>
    </span>
  );
});
