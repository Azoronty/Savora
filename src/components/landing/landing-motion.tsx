"use client";

import { useEffect } from "react";

/**
 * Purposeful, minimal motion: the hero settles in, sections fade up once as
 * they enter. Skipped entirely for prefers-reduced-motion; content is fully
 * visible without JavaScript.
 */
export function LandingMotion() {
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return; // unmounted (or StrictMode's first pass) before the imports resolved
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero]", { opacity: 0, y: 14, duration: 0.7, ease: "power2.out", stagger: 0.08 });
        gsap.from("[data-hero-media]", { opacity: 0, scale: 0.985, duration: 1, ease: "power2.out", delay: 0.15 });
        gsap.from("[data-hero-card]", { opacity: 0, y: 18, duration: 0.7, ease: "power2.out", delay: 0.55 });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 14,
            duration: 0.5,
            ease: "power1.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });
      });
      cleanup = () => mm.revert();
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);
  return null;
}
