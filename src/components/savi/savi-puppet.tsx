"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

/** What animations can ask of Savi's body; tween these values, then call wake(). */
export type PuppetDrive = { crouch: number; reach: number; lean: number; airborne: boolean };
export type PuppetHandle = { drive: PuppetDrive; wake: () => void };

/** Width / height of each stage illustration in public/savi/stage-N.webp. */
const ASPECT = [128 / 156, 157 / 204, 177 / 248, 202 / 278, 222 / 330, 270 / 370, 276 / 367];

/**
 * Savi drawn as the whole stage illustration (the same picture as on the Savi
 * page), animated as one piece: a step bounce and sway while moving, squash
 * for crouching, stretch in the air, a sway for "talking". The loop runs only
 * while something moves.
 */
export const SaviPuppet = forwardRef<
  PuppetHandle,
  { stage: number; height: number; facing: () => number; position: () => { x: number; y: number }; still?: boolean; className?: string }
>(function SaviPuppet({ stage, height, position, still = false, className }, ref) {
  const img = useRef<HTMLImageElement>(null);
  const drive = useRef<PuppetDrive>({ crouch: 0, reach: 0, lean: 0, airborne: false });
  const frame = useRef<number | null>(null);
  const awakeUntil = useRef(0);
  const last = useRef<{ t: number; x: number; y: number } | null>(null);
  const phase = useRef(0);
  const speed = useRef(0);

  const tick = useCallback(() => {
    const now = performance.now();
    const p = position();
    const prev = last.current ?? { t: now - 16, ...p };
    last.current = { t: now, ...p };
    const dt = Math.min(0.1, Math.max(0.001, (now - prev.t) / 1000));
    const d = drive.current;
    // Smoothed ground speed in body heights per second.
    const v = Math.abs(p.x - prev.x) / dt / height;
    speed.current += (v - speed.current) * Math.min(1, dt * 10);
    const walking = !d.airborne && speed.current > 0.15;
    phase.current += dt * (4 + Math.min(speed.current, 4) * 3);

    const step = walking ? Math.abs(Math.sin(phase.current)) : 0;
    const bob = step * height * Math.min(0.09, 0.03 + speed.current * 0.02);
    const sway = (walking ? Math.sin(phase.current) * 5 : 0) + d.lean * 40 + Math.sin(now / 90) * d.reach * 6;
    const squash = d.crouch * 0.2;
    const sy = 1 - squash + (d.airborne ? 0.06 : 0) + step * 0.03;
    const sx = 1 + squash * 0.6 - (d.airborne ? 0.04 : 0);
    const el = img.current;
    if (el) el.style.transform = `translateY(${-bob}px) rotate(${sway}deg) scale(${sx}, ${sy})`;

    const busy = walking || d.airborne || d.crouch > 0.01 || d.reach > 0.01 || Math.abs(d.lean) > 0.01;
    if (busy || now < awakeUntil.current) frame.current = requestAnimationFrame(tick);
    else {
      frame.current = null;
      last.current = null;
      speed.current = 0;
      if (el) el.style.transform = "";
    }
  }, [height, position]);

  const wake = useCallback(() => {
    if (still) return;
    awakeUntil.current = performance.now() + 250;
    if (frame.current === null) frame.current = requestAnimationFrame(tick);
  }, [still, tick]);

  useImperativeHandle(ref, () => ({ drive: drive.current, wake }), [wake]);
  useEffect(() => () => void (frame.current !== null && cancelAnimationFrame(frame.current)), []);

  const aspect = ASPECT[stage - 1] ?? ASPECT[0];
  return (
    <span className={className} style={{ display: "block", position: "relative", width: height * aspect, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small sprite animated by transforms */}
      <img
        ref={img}
        src={`/savi/stage-${stage}.webp`}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full max-w-none"
        style={{ transformOrigin: "50% 100%" }}
      />
    </span>
  );
});
