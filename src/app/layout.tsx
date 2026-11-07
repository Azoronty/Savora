import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TimezoneCookie } from "@/components/app/timezone-cookie";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Savora — Know your kitchen. Waste less.", template: "%s · Savora" },
  description:
    "Savora keeps track of the food you already have, shows what needs using first, and suggests meals built around it.",
  applicationName: "Savora",
};

export const viewport: Viewport = {
  themeColor: "#f5f1e8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${fraunces.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh">
        <TimezoneCookie />
        {children}
      </body>
    </html>
  );
}
