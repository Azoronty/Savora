// Builds the presentation PDFs.
//   Russian (main): prints the live /pitch deck  -> submission/SAVORA-presentation.pdf
//   English:        prints presentation/slides.html -> submission/SAVORA-presentation-en.pdf
// Usage: BASE_URL=http://localhost:3000 node scripts/build-presentation.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = resolve(fileURLToPath(import.meta.url), "../..");
const base = process.env.BASE_URL ?? "http://localhost:3000";
const pdf = { width: "1920px", height: "1080px", printBackground: true, preferCSSPageSize: true };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

await page.goto(`${base}/pitch`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.emulateMedia({ media: "print" });
await page.pdf({ ...pdf, path: `${root}/submission/SAVORA-presentation.pdf` });
console.log("Wrote submission/SAVORA-presentation.pdf (RU)");

await page.emulateMedia({ media: "screen" });
await page.goto(`file://${root}/submission/presentation/slides.html`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ ...pdf, path: `${root}/submission/SAVORA-presentation-en.pdf` });
console.log("Wrote submission/SAVORA-presentation-en.pdf (EN)");

await browser.close();

// Public copies so both PDFs have a link on the live site.
mkdirSync(`${root}/public/presentation`, { recursive: true });
copyFileSync(`${root}/submission/SAVORA-presentation.pdf`, `${root}/public/presentation/savora-ru.pdf`);
copyFileSync(`${root}/submission/SAVORA-presentation-en.pdf`, `${root}/public/presentation/savora-en.pdf`);
console.log("Copied both PDFs to public/presentation/");
