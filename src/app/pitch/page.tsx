import type { Metadata } from "next";
import { Literata, Manrope } from "next/font/google";
import { PitchDeck } from "@/components/pitch/deck";
import { SLIDES } from "@/components/pitch/slides";

// The brand fonts have no Cyrillic, so the Russian deck uses Literata + Manrope.
const literata = Literata({ subsets: ["latin", "cyrillic"], axes: ["opsz"], variable: "--font-literata", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: "Презентация",
  description: "Savora — презентация проекта для хакатона NOTAR Academy.",
};

const PRINT_CSS = `
@page { size: 1920px 1080px; margin: 0; }
@media print {
  html, body { background: #f5f1e8 !important; }
  .pitch-root { position: static !important; overflow: visible !important; background: none !important; }
  .pitch-canvas { position: static !important; transform: none !important; height: auto !important; }
  .pitch-slide { position: relative !important; width: 1920px; height: 1080px; visibility: visible !important; opacity: 1 !important; transform: none !important; break-after: page; }
  .pitch-slide:last-child { break-after: auto; }
  .pitch-slide [data-a] { opacity: 1 !important; visibility: visible !important; transform: none !important; }
  .pitch-slide [data-line] { stroke-dashoffset: 0 !important; }
  .pitch-ui { display: none !important; }
  .pitch-foot { display: flex !important; }
}`;

export default function PitchPage() {
  return (
    <div
      lang="ru"
      className={`${literata.variable} ${manrope.variable}`}
      style={
        {
          "--font-display": "var(--font-literata), Georgia, serif",
          "--font-sans": "var(--font-manrope), system-ui, sans-serif",
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
        } as React.CSSProperties
      }
    >
      <style>{PRINT_CSS}</style>
      <PitchDeck slides={SLIDES} />
    </div>
  );
}
