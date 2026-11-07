"use client";

import { ArrowLeft, ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const W = 1920;
const H = 1080;

/**
 * Presentation shell: a fixed 1920×1080 canvas scaled to fit the window,
 * GSAP slide transitions (direction-aware, staggered content), keyboard,
 * swipe and fullscreen controls, and #n deep links. Every slide is printed
 * as its own page, so the same source produces the PDF.
 */
export function PitchDeck({ slides }: { slides: ReactNode[] }) {
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const previous = useRef(0);
  const busy = useRef(false);
  const touchX = useRef<number | null>(null);
  const total = slides.length;

  const go = useCallback(
    (next: number) => {
      if (busy.current) return;
      setIndex((current) => {
        const target = Math.max(0, Math.min(total - 1, next));
        return target === current ? current : target;
      });
    },
    [total],
  );

  // Deep link: #3 opens the third slide.
  useEffect(() => {
    const fromHash = Number(window.location.hash.slice(1));
    if (fromHash >= 1 && fromHash <= total) {
      previous.current = fromHash - 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL hash is only readable after hydration
      setIndex(fromHash - 1);
    }
  }, [total]);

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        go(index + 1);
      } else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [go, index, total]);

  // Transition between slides.
  useEffect(() => {
    const from = previous.current;
    previous.current = index;
    history.replaceState(null, "", `#${index + 1}`);
    const incoming = slideRefs.current[index];
    const outgoing = from !== index ? slideRefs.current[from] : null;
    if (!incoming) return;

    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dir = index >= from ? 1 : -1;
      const parts = incoming.querySelectorAll("[data-a]");
      const lines = incoming.querySelectorAll("[data-line]");

      gsap.set(slideRefs.current.filter((s) => s && s !== incoming && s !== outgoing), { autoAlpha: 0 });
      if (reduce) {
        if (outgoing) gsap.set(outgoing, { autoAlpha: 0 });
        gsap.set(incoming, { autoAlpha: 1, x: 0 });
        gsap.set(parts, { autoAlpha: 1, y: 0 });
        gsap.set(lines, { strokeDashoffset: 0 });
        return;
      }

      busy.current = true;
      const tl = gsap.timeline();
      if (outgoing) {
        tl.to(outgoing, { autoAlpha: 0, x: -80 * dir, duration: 0.45, ease: "power2.in" }, 0);
      }
      tl.fromTo(
        incoming,
        { autoAlpha: 0, x: 80 * dir },
        { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" },
        outgoing ? 0.25 : 0,
      );
      tl.fromTo(
        parts,
        { autoAlpha: 0, y: 28 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.07 },
        outgoing ? 0.4 : 0.15,
      );
      if (lines.length) {
        tl.fromTo(lines, { strokeDashoffset: 400 }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut", stagger: 0.15 }, "-=0.5");
      }
      // Release controls early so fast clicking still feels responsive.
      tl.call(() => void (busy.current = false), [], 0.55);
    })();
    return () => {
      cancelled = true;
    };
  }, [index]);

  return (
    <div
      className="pitch-root fixed inset-0 overflow-hidden bg-[#0f1f16] text-ink"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div
        className="pitch-canvas absolute left-1/2 top-1/2"
        style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {slides.map((slide, i) => (
          <section
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            aria-hidden={i !== index}
            aria-roledescription="slide"
            aria-label={`Слайд ${i + 1} из ${total}`}
            className="pitch-slide absolute inset-0 overflow-hidden"
            style={{ visibility: i === 0 ? "visible" : "hidden", opacity: i === 0 ? 1 : 0 }}
          >
            {slide}
          </section>
        ))}
      </div>

      <p className="pitch-ui pointer-events-none absolute inset-x-0 top-6 hidden text-center font-mono text-[11px] uppercase tracking-[0.14em] text-white/55 portrait:block sm:portrait:hidden">
        Поверните телефон, так удобнее
      </p>

      {/* Controls */}
      <div className="pitch-ui pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-4 px-5 pb-4 sm:px-8 sm:pb-6">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-[#142a1e]/85 p-1 text-card shadow-lift backdrop-blur">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Предыдущий слайд" className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30">
            <ArrowLeft className="size-4" />
          </button>
          <span className="min-w-16 text-center font-mono text-xs tabular" aria-live="polite">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <button type="button" onClick={() => go(index + 1)} disabled={index === total - 1} aria-label="Следующий слайд" className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30">
            <ArrowRight className="size-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-white/15" aria-hidden="true" />
          <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Выйти из полноэкранного режима" : "Полный экран"} className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/10">
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-saffron transition-[width] duration-500 ease-out" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-white/45 md:block">← → · F — полный экран</span>
      </div>
    </div>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}
