"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  SAVI_MISSIONS,
  SAVI_TOUR,
  reactTo,
  saviProgress,
  shouldSpeak,
  type SaviAnimation,
  type SaviEvent,
  type SaviReaction,
  type SpeechState,
} from "@/lib/domain/savi";
import { cx } from "@/lib/cx";
import { useProductSheet } from "@/components/app/product-sheet";
import { SaviPuppet, type PuppetHandle } from "./savi-puppet";

type Gsap = typeof import("gsap").gsap;

export type SaviContextData = {
  householdId: string;
  today: string;
  mode: "full" | "quiet" | "hidden";
  xp: number;
  missionsDone: string[];
  productCount: number;
  expiring: { names: string[]; count: number };
  readyRecipe: { slug: string; title: string } | null;
};

const SaviBus = createContext<(event: SaviEvent) => void>(() => {});

/** Components call this after a successful action so Savi can react. */
export function useSavi() {
  return useContext(SaviBus);
}

/* ---------- small persistence helpers (per-viewer conveniences only) ---------- */
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: Savi simply forgets */
  }
}

const IDLE_MS = 75_000;
const BUBBLE_MS = 7_000;

export function SaviProvider({ data, children }: { data: SaviContextData; children: ReactNode }) {
  const queue = useRef<((event: SaviEvent) => void) | null>(null);
  const emit = useCallback((event: SaviEvent) => queue.current?.(event), []);
  return (
    <SaviBus value={emit}>
      {children}
      {data.mode !== "hidden" && (
        <SaviCompanion
          data={data}
          register={(fn) => {
            queue.current = fn;
          }}
        />
      )}
    </SaviBus>
  );
}

type Behaviour = [name: string, weight: number, act: () => Promise<unknown> | void];

type Fx = { id: number; kind: "heart" | "spark" | "zzz" | "question" | "xp"; text?: string };

function SaviCompanion({ data, register }: { data: SaviContextData; register: (fn: (e: SaviEvent) => void) => void }) {
  const progress = saviProgress(data.xp);
  const stage = progress.stage;
  const pathname = usePathname();
  const { openNew } = useProductSheet();

  const outer = useRef<HTMLDivElement>(null); // position + hops
  const body = useRef<HTMLButtonElement>(null); // facing, tilt, spin
  const puppet = useRef<PuppetHandle>(null); // limbs: crouch, reach, airborne
  const gsapRef = useRef<Gsap | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [speech, setSpeech] = useState<SaviReaction | null>(null);
  const [asleep, setAsleep] = useState(false);
  const [fx, setFx] = useState<Fx[]>([]);
  const [shownStage, setShownStage] = useState(stage.n);
  const [peeking, setPeeking] = useState(false);
  // Tour: current step plus where Savi stood when it opened (the guide card is placed from it).
  const [tour, setTour] = useState<{ i: number; n: number; total: number; x: number; y: number; vw: number; vh: number } | null>(null);
  const [touring, setTouring] = useState(false);
  const [spot, setSpot] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const spotEl = useRef<HTMLElement | null>(null);
  const tourActive = useRef(false);
  const bubbleEl = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // Bubbles open towards the middle of the screen so they never run off the edge.
  const [bubbleRight, setBubbleRight] = useState(false);
  const tourAnswer = useRef<((go: boolean) => void) | null>(null);
  const pos = useRef({ x: 0, y: 0 });
  const facing = useRef(1);
  const lastInput = useRef(0);
  const busy = useRef(false);
  const tipIndex = useRef(0);
  const keyBase = `savi:${data.householdId}`;
  const speechState = useRef<SpeechState>({ showingSince: null, showingPriority: null, lastAmbientAt: 0, lastByKey: {} });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fxId = useRef(0);
  const inspectTarget = useRef<string | undefined>(undefined);
  const lastBehaviour = useRef("");

  // Savi grows during the tour so the guide is easy to follow.
  const height = (desktop ? 70 + (stage.n - 1) * 5 : 46 + (stage.n - 1) * 2) * (touring ? 1.45 : 1);

  /* ---------- environment ---------- */
  useEffect(() => {
    const mqDesk = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setDesktop(mqDesk.matches);
      setReduced(mqMotion.matches);
    };
    sync();
    mqDesk.addEventListener("change", sync);
    mqMotion.addEventListener("change", sync);
    lastInput.current = Date.now();
    import("gsap").then(({ gsap }) => (gsapRef.current = gsap));
    speechState.current.lastByKey = load(`${keyBase}:said`, {});
    return () => {
      mqDesk.removeEventListener("change", sync);
      mqMotion.removeEventListener("change", sync);
    };
  }, [keyBase]);

  // Asleep: curls up (knees in, slumped) instead of squashing the picture.
  useEffect(() => {
    const p = puppet.current;
    if (!p) return;
    p.drive.crouch = asleep ? 0.9 : 0;
    p.drive.lean = asleep ? 0.14 : 0;
    p.wake();
  }, [asleep]);

  /* ---------- geometry ---------- */
  const home = useCallback((): { x: number; y: number; minX: number; maxX: number } => {
    const zone = document.querySelector<HTMLElement>("[data-savi-home]");
    if (desktop && zone) {
      const r = zone.getBoundingClientRect();
      return { x: r.left + r.width * 0.3, y: r.bottom - 6, minX: r.left + 44, maxX: r.right - 44 };
    }
    // Phones: Savi stands on the top edge of the bottom navigation and walks along it.
    const nav = document.querySelector<HTMLElement>("nav[aria-label='Main'].fixed")?.getBoundingClientRect();
    const y = nav ? nav.top + 1 : window.innerHeight - 64;
    const minX = (nav?.left ?? 0) + 32;
    const maxX = (nav?.right ?? window.innerWidth) - 32;
    return { x: maxX - 24, y, minX, maxX };
  }, [desktop]);

  const place = useCallback((x: number, y: number) => {
    pos.current = { x, y };
    const el = outer.current;
    if (el) el.style.transform = `translate(${x}px, ${y}px)`;
    puppet.current?.wake();
  }, []);
  const aimBubble = useCallback(() => setBubbleRight(pos.current.x > window.innerWidth / 2), []);

  useEffect(() => {
    // Keep Savi where it is along its zone (phones resize as the address bar hides); start at home.
    const fit = () => {
      if (tourActive.current) return; // the tour moves Savi itself, also across page changes
      const h = home();
      const x = pos.current.x ? Math.min(h.maxX, Math.max(h.minX, pos.current.x)) : h.x;
      place(x, h.y);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [home, place, pathname]);

  /* ---------- animation primitives ---------- */
  /** Tween Savi's body controls (crouch / reach / lean); limbs follow through physics. */
  const body$ = useCallback((vars: Exclude<Parameters<Gsap["to"]>[1], number>) => {
    const p = puppet.current;
    return p ? { target: p.drive, vars: { ...vars, onUpdate: p.wake } } : null;
  }, []);
  const setAir = useCallback((air: boolean) => {
    const p = puppet.current;
    if (!p) return;
    p.drive.airborne = air;
    p.wake();
  }, []);

  const addFx = useCallback((kind: Fx["kind"], text?: string) => {
    const id = ++fxId.current;
    setFx((all) => [...all.slice(-4), { id, kind, text }]);
    setTimeout(() => setFx((all) => all.filter((f) => f.id !== id)), 1600);
  }, []);

  const face = useCallback((dir: number) => {
    facing.current = dir;
    if (body.current) body.current.style.setProperty("--face", String(dir));
  }, []);

  const hopTo = useCallback(
    (x: number, y: number) =>
      new Promise<void>((resolve) => {
        const g = gsapRef.current;
        const el = outer.current;
        const b = body.current;
        if (!g || !el || !b || reduced) {
          place(x, y);
          return resolve();
        }
        const from = { ...pos.current };
        face(x >= from.x ? 1 : -1);
        const state = { t: 0 };
        const arc = Math.min(60, 24 + Math.abs(x - from.x) * 0.15);
        const crouch = (c: number, duration: number) => {
          const t = body$({ crouch: c, duration, ease: "power2.out" });
          return t ? tl.to(t.target, t.vars) : tl;
        };
        const tl = g.timeline({ onComplete: resolve });
        // Gather (knees bend), spring off, fly a ballistic arc, land and absorb the impact.
        crouch(0.8, 0.14);
        tl.call(() => setAir(true)).set(puppet.current?.drive ?? {}, { crouch: 0 });
        tl.to(state, {
          t: 1,
          duration: 0.5,
          ease: "none",
          onUpdate: () => {
            const t = state.t;
            place(from.x + (x - from.x) * t, from.y + (y - from.y) * t - 4 * arc * t * (1 - t));
          },
        });
        tl.call(() => setAir(false));
        crouch(0.55, 0.06);
        crouch(0, 0.3);
      }),
    [body$, face, place, reduced, setAir],
  );

  /** Walk or run along a line: stepped bobbing, a slight lean, facing the direction of travel. */
  const travel = useCallback(
    (x: number, y: number, pace: "walk" | "run") =>
      new Promise<void>((resolve) => {
        const g = gsapRef.current;
        const b = body.current;
        if (!g || !b || reduced) {
          place(x, y);
          return resolve();
        }
        const from = { ...pos.current };
        const dist = Math.hypot(x - from.x, y - from.y);
        if (dist < 4) return resolve();
        face(x >= from.x ? 1 : -1);
        const speed = pace === "run" ? 260 : 95;
        const state = { t: 0 };
        // Legs, arm swing, bounce and lean all come from the speed (see SaviPuppet).
        g.timeline({ onComplete: resolve }).to(state, {
          t: 1,
          duration: dist / speed,
          ease: "power1.inOut",
          onUpdate: () => place(from.x + (x - from.x) * state.t, from.y + (y - from.y) * state.t),
        });
      }),
    [face, place, reduced],
  );

  /** Roll (tumble) along the ground: rotation matches the distance travelled. */
  const rollTo = useCallback(
    (x: number) =>
      new Promise<void>((resolve) => {
        const g = gsapRef.current;
        const b = body.current;
        if (!g || !b || reduced) return resolve();
        const from = { ...pos.current };
        const dir = x >= from.x ? 1 : -1;
        face(dir);
        const state = { t: 0 };
        const turns = Math.max(1, Math.round(Math.abs(x - from.x) / (Math.PI * height * 0.55)));
        const tuck = body$({ crouch: 0.9, duration: 0.15 });
        const untuck = body$({ crouch: 0, duration: 0.35, ease: "power2.out" });
        const tl = g.timeline({ onComplete: resolve });
        if (tuck) tl.to(tuck.target, tuck.vars);
        tl.to(state, {
            t: 1,
            duration: 0.35 * turns + 0.2,
            ease: "power1.inOut",
          onUpdate: () => {
            place(from.x + (x - from.x) * state.t, from.y - Math.sin(Math.PI * state.t) * 6);
            b.style.rotate = `${state.t * 360 * turns * dir}deg`;
          },
        });
        tl.call(() => void (b.style.rotate = ""));
        if (untuck) tl.to(untuck.target, untuck.vars);
      }),
    [body$, face, height, place, reduced],
  );

  /** Duck behind the account panel, peek over its edge, then pop back up. */
  const hideAndPeek = useCallback(async () => {
    const g = gsapRef.current;
    const el = outer.current;
    const b = body.current;
    if (!g || !el || !b || reduced) return;
    el.style.clipPath = "inset(-400px -400px 0 -400px)";
    await g.to(b, { y: height * 1.05, duration: 0.45, ease: "power2.in" });
    await g.to(b, { y: height * 0.55, duration: 0.5, ease: "power2.out", delay: 1.2 });
    face(-facing.current);
    await g.to(b, { y: height * 0.55, duration: 0.5 });
    face(-facing.current);
    addFx("question");
    await g.to(b, { y: 0, duration: 0.5, ease: "back.out(2.4)", delay: 0.4 });
    el.style.clipPath = "";
  }, [addFx, face, height, reduced]);

  const lookAround = useCallback(async () => {
    const g = gsapRef.current;
    const b = body.current;
    if (!g || !b || reduced) return;
    face(-1);
    await g.to(b, { rotation: -7, duration: 0.3, ease: "power2.out" });
    await g.to(b, { rotation: 0, duration: 0.3, delay: 0.6 });
    face(1);
    await g.to(b, { rotation: 7, duration: 0.3, ease: "power2.out" });
    await g.to(b, { rotation: 0, duration: 0.3, delay: 0.6 });
  }, [face, reduced]);

  /** Go and look at a product row: run to the edge of the sidebar, hop into the gutter beside the row, lean in. */
  const inspectProduct = useCallback(
    async (name?: string) => {
      const g = gsapRef.current;
      const b = body.current;
      if (!g || !b || reduced) return;
      const rows = [...document.querySelectorAll<HTMLElement>("[data-savi-product]")].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top > 90 && r.bottom < window.innerHeight - 40;
      });
      const row = (name && rows.find((el) => el.dataset.saviProduct?.toLowerCase() === name.toLowerCase())) || (!name ? rows[Math.floor(Math.random() * rows.length)] : undefined);
      const h = home();
      if (!desktop || !row) {
        face(1);
        addFx("question");
        await g.timeline().to(b, { rotation: 12, x: 6, duration: 0.35, ease: "power2.out" }).to(b, { rotation: 0, x: 0, duration: 0.4, delay: 0.9 });
        return;
      }
      const r = row.getBoundingClientRect();
      b.style.pointerEvents = "none"; // never block clicks while away from home
      await travel(h.maxX, h.y, "run");
      await hopTo(r.left - 12, r.top + r.height * 0.78);
      face(1);
      addFx("question");
      row.style.transition = "background-color 300ms";
      row.style.backgroundColor = "var(--color-saffron-soft)";
      await g.timeline().to(b, { rotation: 14, x: 8, duration: 0.35, ease: "power2.out" }).to(b, { rotation: 0, x: 0, duration: 0.4, delay: 1.1 });
      row.style.backgroundColor = "";
      await hopTo(h.maxX, h.y);
      await travel(h.x, h.y, "walk");
      b.style.pointerEvents = "";
    },
    [addFx, desktop, face, home, hopTo, reduced, travel],
  );

  /** A vertical jump on the spot (optionally with a flip): crouch, take off, fly, land, absorb. */
  const jumpInPlace = useCallback(
    async (rise: number, flip: number) => {
      const g = gsapRef.current;
      const b = body.current;
      const down = body$({ crouch: 0.75, duration: 0.12, ease: "power2.out" });
      if (!g || !b || !down) return;
      await g.to(down.target, down.vars);
      setAir(true);
      puppet.current!.drive.crouch = 0;
      await g.timeline().to(b, { y: -rise, rotation: flip, duration: 0.24 + rise / 200, ease: "power2.out" }).to(b, { y: 0, duration: 0.2 + rise / 260, ease: "power2.in" });
      g.set(b, { rotation: 0 });
      setAir(false);
      const absorb = body$({ crouch: 0.5, duration: 0.06 });
      const up = body$({ crouch: 0, duration: 0.3, ease: "power2.out" });
      if (absorb && up) await g.timeline().to(absorb.target, absorb.vars).to(up.target, up.vars);
    },
    [body$, setAir],
  );

  const play = useCallback(
    async (animation: SaviAnimation) => {
      const g = gsapRef.current;
      const b = body.current;
      if (!g || !b || reduced) {
        if (animation === "levelUp") setShownStage(stage.n);
        return;
      }
      busy.current = true;
      switch (animation) {
        case "talk": {
          // Talks with its hands.
          const wave = body$({ reach: 0.35, duration: 0.22, ease: "sine.inOut", yoyo: true, repeat: 3 });
          if (wave) await g.to(wave.target, wave.vars);
          break;
        }
        case "hop":
          await jumpInPlace(12, 0);
          break;
        case "wiggle":
          addFx("heart");
          await g.timeline().to(b, { rotation: 8, duration: 0.1, yoyo: true, repeat: 5, ease: "sine.inOut" }).to(b, { rotation: 0, duration: 0.1 });
          break;
        case "inspect":
          // The product row appears after the server refresh; give it a moment.
          await new Promise((r) => setTimeout(r, 900));
          await inspectProduct(inspectTarget.current);
          break;
        case "celebrate":
          addFx("spark");
          addFx("heart");
          await jumpInPlace(26, 0);
          await jumpInPlace(20, 360);
          {
            const cheer = body$({ reach: 1, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1, repeatDelay: 0.5 });
            if (cheer) await g.to(cheer.target, cheer.vars);
          }
          break;
        case "levelUp":
          addFx("spark");
          await g.timeline().to(b, { scale: 0.2, opacity: 0, filter: "brightness(2.4)", duration: 0.35, ease: "power2.in" });
          setShownStage(stage.n);
          addFx("spark");
          await g.timeline().to(b, { scale: 1, opacity: 1, filter: "brightness(1)", duration: 0.7, ease: "back.out(2.2)" });
          break;
        case "sleep":
          setAsleep(true);
          break;
      }
      busy.current = false;
    },
    [addFx, body$, inspectProduct, jumpInPlace, reduced, stage.n],
  );

  /* ---------- first-visit tour ---------- */
  const measureSpot = useCallback(() => {
    const el = spotEl.current;
    if (!el) return setSpot(null);
    const r = el.getBoundingClientRect();
    const top = Math.max(r.top, 8);
    const bottom = Math.min(r.bottom, window.innerHeight - 8);
    setSpot(bottom > top ? { top, left: r.left, width: r.width, height: bottom - top } : null);
  }, []);
  const spotOn = spot !== null;
  useEffect(() => {
    if (!spotOn) return;
    window.addEventListener("scroll", measureSpot, { passive: true });
    window.addEventListener("resize", measureSpot);
    return () => {
      window.removeEventListener("scroll", measureSpot);
      window.removeEventListener("resize", measureSpot);
    };
  }, [spotOn, measureSpot]);

  const runTour = useCallback(async () => {
    tourActive.current = true;
    busy.current = true;
    setAsleep(false);
    setTouring(true);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const waitFor = async (ok: () => boolean) => {
      for (let t = 0; t < 60 && !ok(); t++) await sleep(100);
    };
    const visible = (href: string) =>
      [...document.querySelectorAll<HTMLElement>(`nav[aria-label='Main'] a[href="${href}"]`)].find((a) => a.getBoundingClientRect().width > 0);
    const goTo = async (el?: HTMLElement) => {
      const h = home();
      if (!el) return desktop ? hopTo(h.x, h.y) : travel(h.x, h.y, "walk");
      const r = el.getBoundingClientRect();
      if (desktop) {
        // Stand just outside the sidebar, level with the link, and face it.
        await hopTo((el.closest("aside")?.getBoundingClientRect().right ?? r.right) + 30, r.bottom - 2);
        face(-1);
      } else {
        await travel(Math.min(h.maxX, Math.max(h.minX, r.left + r.width / 2)), h.y, "walk");
      }
    };
    // Open the page Savi is standing at and light up the part it talks about.
    const open = async (href: string, selector?: string) => {
      if (location.pathname !== href) router.push(href);
      await waitFor(() => location.pathname === href && (!selector || !!document.querySelector(selector)));
      const el = selector ? document.querySelector<HTMLElement>(selector) : null;
      spotEl.current = el;
      if (el) {
        window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96), behavior: reduced ? "auto" : "smooth" });
        await sleep(reduced ? 50 : 550);
      }
      measureSpot();
    };
    const last = SAVI_TOUR.length - 1;
    // Count only the sections this layout shows, so the "n of total" counter has no gaps.
    const total = SAVI_TOUR.filter((s) => s.href && (s.anywhere || visible(s.href))).length;
    let n = 0;
    for (let i = 0; i < SAVI_TOUR.length; i++) {
      const step = SAVI_TOUR[i];
      const link = step.href ? visible(step.href) : undefined;
      if (step.href && !link && !step.anywhere) continue; // e.g. "Use soon" is not in the phone navigation
      if (step.href) {
        n++;
        await goTo(link);
        if (link) link.style.backgroundColor = "var(--color-saffron-soft)";
        await open(step.href, step.spot);
      } else if (i === last) {
        await open("/app");
        await goTo();
      }
      setTour({ i, n, total, x: pos.current.x, y: pos.current.y, vw: window.innerWidth, vh: window.innerHeight });
      const go = await new Promise<boolean>((resolve) => (tourAnswer.current = resolve));
      if (link) link.style.backgroundColor = "";
      setTour(null);
      spotEl.current = null;
      setSpot(null);
      if (!go) break;
    }
    await goTo();
    setTouring(false);
    save(`${keyBase}:tour`, true);
    tourActive.current = false;
    busy.current = false;
  }, [desktop, face, home, hopTo, keyBase, measureSpot, reduced, router, travel]);

  // Keep speech bubbles inside the screen, whatever side they open to.
  useLayoutEffect(() => {
    const el = bubbleEl.current;
    if (!el) return;
    el.style.marginLeft = "0px";
    const r = el.getBoundingClientRect();
    const shift = r.right > window.innerWidth - 8 ? window.innerWidth - 8 - r.right : r.left < 8 ? 8 - r.left : 0;
    el.style.marginLeft = `${shift}px`;
  }, [speech, bubbleRight]);

  /* ---------- speech ---------- */
  const dismiss = useCallback(() => {
    clearTimeout(hideTimer.current);
    setSpeech(null);
    speechState.current.showingSince = null;
    speechState.current.showingPriority = null;
  }, []);

  const handle = useCallback(
    (event: SaviEvent) => {
      const reaction = reactTo(event);
      const now = Date.now();
      inspectTarget.current = event.type === "product_added" ? event.name : undefined;
      setAsleep(false);
      if (data.mode === "quiet" || !shouldSpeak(reaction, speechState.current, now)) {
        if (reaction.priority !== "ambient") void play(reaction.animation);
        return;
      }
      const st = speechState.current;
      st.showingSince = now;
      st.showingPriority = reaction.priority;
      st.lastByKey = { ...st.lastByKey, [reaction.key]: now };
      if (reaction.priority === "ambient") st.lastAmbientAt = now;
      save(`${keyBase}:said`, st.lastByKey);
      aimBubble();
      setSpeech(reaction);
      void play(reaction.animation);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(dismiss, reaction.priority === "milestone" ? BUBBLE_MS + 3000 : BUBBLE_MS);
    },
    [aimBubble, data.mode, dismiss, keyBase, play],
  );

  useEffect(() => register(handle), [handle, register]);

  /* ---------- milestones from server data (XP, missions, stages) ---------- */
  useEffect(() => {
    const seenStage = load<number>(`${keyBase}:stage`, 0);
    const seenXp = load<number>(`${keyBase}:xp`, -1);
    const seenMissions = load<string[]>(`${keyBase}:missions:${data.today}`, []);
    const newMissions = data.missionsDone.filter((m) => !seenMissions.includes(m));
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (seenXp >= 0 && data.xp > seenXp) timers.push(setTimeout(() => addFx("xp", `+${data.xp - seenXp} XP`), 600));
    if (seenStage && stage.n > seenStage) {
      // Show the previous form first so the level-up reveal can swap it (localStorage is client-only).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShownStage(seenStage);
      timers.push(setTimeout(() => handle({ type: "level_up", stage }), 900));
    } else if (newMissions.length && seenXp >= 0) {
      const mission = SAVI_MISSIONS.find((m) => m.key === newMissions[0]);
      if (mission) timers.push(setTimeout(() => handle({ type: "mission_completed", mission: mission.key, xp: mission.xp }), 900));
    } else {
      setShownStage(stage.n);
    }
    save(`${keyBase}:stage`, stage.n);
    save(`${keyBase}:xp`, data.xp);
    save(`${keyBase}:missions:${data.today}`, data.missionsDone);
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react only when server values change
  }, [data.xp, data.missionsDone.join(), stage.n]);

  /* ---------- contextual hints on each page ---------- */
  useEffect(() => {
    const t = setTimeout(() => {
      if (tourActive.current) return;
      if (pathname === "/app" && data.mode === "full" && !load(`${keyBase}:tour`, false)) {
        save(`${keyBase}:welcomed`, true);
        return void runTour();
      }
      if (!load(`${keyBase}:welcomed`, false)) {
        save(`${keyBase}:welcomed`, true);
        return handle({ type: "welcome" });
      }
      if (data.productCount === 0) handle({ type: "empty_inventory" });
      else if (data.expiring.count > 0) {
        handle({ type: "expiring", ...data.expiring });
        // When the hint is spoken on a page that lists products, go and point at the first one.
        const spoke = (speechState.current.lastByKey.expiring ?? 0) > Date.now() - 1000;
        if (spoke && desktop && (pathname === "/app/inventory" || pathname === "/app/expiring")) {
          inspectTarget.current = data.expiring.names[0];
          void play("inspect");
        }
      } else if (data.readyRecipe) handle({ type: "recipe_match", ...data.readyRecipe });
    }, 3500);
    return () => clearTimeout(t);
    // Once per page view; `desktop` is listed so the timer is rescheduled with the real layout after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, desktop]);

  /* ---------- cursor awareness (desktop), idle, wandering ---------- */
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      lastInput.current = Date.now();
      if (asleep && desktop) {
        const dx = e.clientX - pos.current.x;
        const dy = e.clientY - pos.current.y;
        if (dx * dx + dy * dy < 160 * 160) setAsleep(false);
      }
      if (!desktop || busy.current || reduced) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const b = body.current;
        if (!b) return;
        const dx = e.clientX - pos.current.x;
        const dy = e.clientY - (pos.current.y - height / 2);
        const near = Math.hypot(dx, dy) < 320;
        face(near ? (dx >= 0 ? 1 : -1) : facing.current);
        b.style.setProperty("--tilt", near ? `${Math.max(-8, Math.min(8, dx / 30))}deg` : "0deg");
        b.style.setProperty("--lean", near ? `${Math.max(-4, Math.min(4, dy / 60))}px` : "0px");
      });
    };
    const onKey = () => (lastInput.current = Date.now());
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", onKey);

    const tick = setInterval(() => {
      const quietFor = Date.now() - lastInput.current;
      if (busy.current || speech || document.querySelector("dialog[open]")) return;
      if (quietFor > IDLE_MS && !asleep) {
        handle({ type: "idle" });
        setAsleep(true);
        return;
      }
      if (reduced || asleep || quietFor < 4000) return;
      // Weighted, never the same behaviour twice in a row, and often nothing at all.
      const h = home();
      if (Math.abs(pos.current.y - h.y) > 2) place(pos.current.x, h.y);
      const spot = () => h.minX + Math.random() * (h.maxX - h.minX);
      const options: Behaviour[] = [
        ["walk", 0.2, () => travel(spot(), h.y, "walk")],
        ["run", 0.07, () => travel(pos.current.x < (h.minX + h.maxX) / 2 ? h.maxX : h.minX, h.y, "run")],
        ["roll", 0.08, () => rollTo(pos.current.x < (h.minX + h.maxX) / 2 ? h.maxX : h.minX)],
        ["jump", 0.08, () => hopTo(spot(), h.y)],
        ["look", 0.12, lookAround],
        ["hide", 0.06, hideAndPeek],
        ...(desktop
          ? ([
              ["peek", 0.06, peek],
              ["inspect", 0.06, () => inspectProduct()],
            ] as Behaviour[])
          : []),
      ];
      let r = Math.random();
      for (const [name, weight, act] of options) {
        if ((r -= weight) > 0) continue;
        if (name === lastBehaviour.current) return;
        lastBehaviour.current = name;
        busy.current = true;
        void Promise.resolve(act()).finally(() => (busy.current = false));
        return;
      }
    }, 8000);

    async function peek() {
      const g = gsapRef.current;
      const zone = document.querySelector<HTMLElement>("[data-savi-home]");
      const el = outer.current;
      if (!g || !zone || !el) return;
      busy.current = true;
      const edge = zone.closest("aside")?.getBoundingClientRect().right ?? 264;
      const y = window.innerHeight * (0.45 + Math.random() * 0.25);
      setPeeking(true);
      face(1);
      place(edge - 6, y);
      el.style.setProperty("--peek-clip", "100%");
      await g.to(el, { "--peek-clip": "45%", duration: 0.5, ease: "power2.out" });
      addFx("question");
      await g.to(el, { "--peek-clip": "100%", duration: 0.4, ease: "power2.in", delay: 1.4 });
      setPeeking(false);
      const h = home();
      place(h.x, h.y);
      await g.fromTo(body.current, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "bounce.out" });
      busy.current = false;
    }

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      clearInterval(tick);
      cancelAnimationFrame(raf);
    };
  }, [asleep, desktop, face, handle, height, home, hopTo, place, reduced, speech, addFx, travel, rollTo, lookAround, hideAndPeek, inspectProduct, play]);

  const onPet = () => {
    lastInput.current = Date.now();
    if (asleep) {
      setAsleep(false);
      void play("hop");
      return;
    }
    handle({ type: "pet", tip: tipIndex.current++ });
  };

  const label = useMemo(() => `Savi, your kitchen companion. Stage ${stage.n}: ${stage.name}. ${data.xp} XP.`, [stage, data.xp]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed left-0 top-0 z-[45]" style={{ width: 0, height: 0 }}>
      {/* tour spotlight: dims the page around the part Savi talks about (below Savi, above the page) */}
      {spot && (
        <div
          aria-hidden="true"
          className="fixed rounded-2xl ring-2 ring-saffron transition-all duration-300"
          style={{
            top: spot.top - 8,
            left: spot.left - 8,
            width: spot.width + 16,
            height: spot.height + 16,
            boxShadow: "0 0 0 200vmax rgb(20 42 30 / 0.45)",
          }}
        />
      )}
      <div
        ref={outer}
        className="absolute left-0 top-0 will-change-transform"
        style={{ clipPath: peeking ? "inset(0 0 0 var(--peek-clip, 100%))" : undefined }}
      >
        {/* bubble */}
        {speech && !tour && (
          <div
            ref={bubbleEl}
            role="status"
            className={cx(
              "pointer-events-auto absolute w-max max-w-[15rem] animate-rise rounded-2xl border border-line bg-card px-4 py-3 text-sm text-ink shadow-lift",
              bubbleRight ? "right-0 translate-x-6" : "left-0 -translate-x-6",
            )}
            style={{ bottom: height + 8 }}
            onMouseEnter={() => clearTimeout(hideTimer.current)}
            onMouseLeave={() => (hideTimer.current = setTimeout(dismiss, 3000))}
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss Savi's message"
              className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full text-muted hover:bg-paper-deep hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
            <p className="pr-5 leading-snug">{speech.text}</p>
            {speech.action &&
              (speech.action.href ? (
                <Link
                  href={speech.action.href}
                  onClick={dismiss}
                  className="mt-2 inline-flex h-8 items-center rounded-full bg-forest px-3 text-xs font-medium text-card hover:bg-forest-deep"
                >
                  {speech.action.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    dismiss();
                    openNew();
                  }}
                  className="mt-2 inline-flex h-8 items-center rounded-full bg-forest px-3 text-xs font-medium text-card hover:bg-forest-deep"
                >
                  {speech.action.label}
                </button>
              ))}
            <span
              aria-hidden="true"
              className={cx(
                "absolute size-3 rotate-45 border-line bg-card",
                "-bottom-[7px] border-b border-r",
                bubbleRight ? "right-10" : "left-10",
              )}
            />
          </div>
        )}

        {/* character: anchored by its bottom-centre */}
        <button
          ref={body}
          type="button"
          onClick={onPet}
          aria-label={label}
          title={`Savi · ${stage.name}`}
          className="savi-body pointer-events-auto absolute bottom-0 left-0 block -translate-x-1/2 cursor-pointer select-none rounded-full outline-offset-4"
          style={{ height }}
        >
          <span className="savi-face relative block h-full">
            <span aria-hidden="true" className="absolute -bottom-1 left-1/2 h-2 w-3/5 -translate-x-1/2 rounded-[50%] bg-forest-deep/20 blur-[2px]" />
            <SaviPuppet
              ref={puppet}
              stage={shownStage}
              height={height}
              facing={() => facing.current}
              position={() => pos.current}
              still={reduced}
              className="savi-sprite"
            />
          </span>
          {fx.map((f) => (
            <SaviFx key={f.id} fx={f} />
          ))}
          {asleep && <SaviFx fx={{ id: -1, kind: "zzz" }} loop />}
        </button>
      </div>

      {/* tour guide card: fixed to the screen, so it never runs off the edge */}
      {tour && (
        <TourCard
          step={tour.i}
          n={tour.n}
          total={tour.total}
          bottom={tour.vh - tour.y + height + 12}
          desktop={desktop}
          x={tour.x}
          vw={tour.vw}
          onAnswer={(go) => tourAnswer.current?.(go)}
        />
      )}
    </div>
  );
}

function TourCard({
  step,
  n,
  total,
  bottom,
  desktop,
  x,
  vw,
  onAnswer,
}: {
  step: number;
  n: number;
  total: number;
  bottom: number;
  desktop: boolean;
  x: number;
  vw: number;
  onAnswer: (go: boolean) => void;
}) {
  const last = SAVI_TOUR.length - 1;
  // Desktop: opens to the right of Savi. Phone: full width with a 16px gutter, pointer above Savi.
  const left = desktop ? x - 32 : 16;
  const arrow = Math.min(Math.max(x - left - 7, 20), (desktop ? 352 : vw - 32) - 34);
  return (
    <div
      role="dialog"
      aria-label="Savi's tour"
      onKeyDown={(e) => e.key === "Escape" && onAnswer(false)}
      className="pointer-events-auto fixed animate-rise rounded-2xl border border-line bg-card p-5 text-ink shadow-lift"
      style={desktop ? { left, bottom, width: 352 } : { left, right: 16, bottom }}
    >
      {step > 0 && step < last && (
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
          Tour · {n} of {total}
        </p>
      )}
      <p className={cx("text-base leading-snug sm:text-[1.0625rem]", step > 0 && step < last && "mt-1.5")}>{SAVI_TOUR[step].text}</p>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          autoFocus
          onClick={() => onAnswer(true)}
          className="inline-flex h-10 items-center rounded-full bg-forest px-5 text-sm font-medium text-card hover:bg-forest-deep"
        >
          {step === 0 ? "Show me" : step === last ? "Done" : "Next"}
        </button>
        {step < last && (
          <button
            type="button"
            onClick={() => onAnswer(false)}
            className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-muted hover:bg-paper-deep hover:text-ink"
          >
            {step === 0 ? "Not now" : "Skip tour"}
          </button>
        )}
      </div>
      <span aria-hidden="true" className="absolute -bottom-[7px] size-3 rotate-45 border-b border-r border-line bg-card" style={{ left: arrow }} />
    </div>
  );
}

function SaviFx({ fx, loop = false }: { fx: Fx; loop?: boolean }) {
  const common = "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 savi-fx";
  if (fx.kind === "xp")
    return <span className={cx(common, "whitespace-nowrap rounded-full bg-saffron px-2 py-0.5 font-mono text-[11px] font-medium text-forest-deep")}>{fx.text}</span>;
  if (fx.kind === "zzz")
    return (
      <span className={cx(common, "left-[80%] font-display text-base italic text-forest-mid", loop && "savi-fx-loop")} aria-hidden="true">
        z<span className="text-xs">z</span>
      </span>
    );
  if (fx.kind === "question")
    return <span className={cx(common, "left-[78%] font-display text-xl font-medium text-soon")} aria-hidden="true">?</span>;
  if (fx.kind === "heart")
    return (
      <svg className={cx(common, "left-[72%] size-4 text-expired")} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z" />
      </svg>
    );
  return (
    <svg className={cx(common, "left-[25%] size-5 text-saffron")} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
    </svg>
  );
}
