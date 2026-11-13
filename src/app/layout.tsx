import type { Metadata, Viewport } from "next";
import { Fraunces, Golos_Text, Instrument_Sans, JetBrains_Mono, Literata } from "next/font/google";
import "./globals.css";
import { TimezoneCookie } from "@/components/app/timezone-cookie";
import { LangProvider } from "@/components/i18n/lang-provider";
import { getLang, getT } from "@/lib/i18n/server";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
  // No metric fallback: it would catch Cyrillic before the Cyrillic fonts below.
  adjustFontFallback: false,
});
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap", adjustFontFallback: false });
// Fraunces and Instrument Sans have no Cyrillic; these fill in Russian glyphs only.
const literata = Literata({ subsets: ["cyrillic"], variable: "--font-literata", display: "swap", adjustFontFallback: false });
const golos = Golos_Text({ subsets: ["cyrillic"], variable: "--font-golos", display: "swap", adjustFontFallback: false });
const jetbrains = JetBrains_Mono({ subsets: ["latin", "cyrillic"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t("Savora — Know your kitchen. Waste less."), template: "%s · Savora" },
    description: t("Savora keeps track of the food you already have, shows what needs using first, and suggests meals built around it."),
    applicationName: "Savora",
  };
}

export const viewport: Viewport = {
  themeColor: "#f5f1e8",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html lang={lang} data-scroll-behavior="smooth" className={`${fraunces.variable} ${instrument.variable} ${jetbrains.variable} ${literata.variable} ${golos.variable}`}>
      <body className="min-h-dvh">
        <TimezoneCookie />
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
