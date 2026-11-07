// End-to-end smoke test against a running SAVORA instance.
// Usage: BASE_URL=http://localhost:3000 SHOTS=./shots node scripts/e2e-smoke.mjs
import { createRequire } from "node:module";
// Uses the project-local or globally installed Playwright.
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Asia/Tashkent" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

const step = async (name, fn) => {
  process.stdout.write(`• ${name} … `);
  await fn();
  console.log("ok");
};
const go = async (path) => {
  await page.goto(path.startsWith("http") ? path : `${BASE}${path}`);
  await page.waitForLoadState("networkidle");
};
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
const toast = (text) => page.getByRole("status").filter({ hasText: text }).first().waitFor({ timeout: 15000 });

await step("landing renders", async () => {
  await go("/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await shot("landing");
});

await step("demo sign-in seeds a sample kitchen", async () => {
  await page.getByRole("button", { name: /explore the live demo/i }).first().click();
  await page.waitForURL(/\/app$/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await page.getByText("Sample", { exact: true }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.getByRole("heading", { name: "The week ahead" }).waitFor();
  await shot("dashboard");
});

await step("inventory lists, filters and searches", async () => {
  await go(`/app/inventory`);
  await page.getByText("Baby spinach").first().waitFor();
  await page.getByRole("tab", { name: /Past date/ }).click();
  await page.waitForURL(/status=expired/);
  await page.getByText("Whole milk").first().waitFor();
  await page.getByRole("tab", { name: /All/ }).click();
  await page.waitForURL((url) => !url.search.includes("status"));
  await page.getByLabel("Search products").fill("rice");
  await page.waitForURL(/q=rice/);
  await page.getByText("Basmati rice").waitFor();
  await page.getByText("Baby spinach").waitFor({ state: "detached" });
  await go(`/app/inventory`);
  await shot("inventory");
});

await step("add product with catalog autofill", async () => {
  await page.getByRole("button", { name: "Add product" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "What is it?" }).fill("Avoca");
  await dialog.getByRole("option", { name: /Avocado/ }).click();
  await dialog.getByLabel("Category").evaluate((el) => {
    if (el.value !== "vegetables") throw new Error(`category not autofilled: ${el.value}`);
  });
  await shot("add-product");
  await dialog.getByRole("button", { name: "Add to inventory" }).click();
  await toast("Avocado added");
  await page.getByText("Avocado", { exact: true }).first().waitFor();
});

await step("edit product", async () => {
  const row = page.locator("li", { hasText: "Avocado" }).first();
  await row.getByRole("button", { name: /More actions/ }).click();
  await page.getByRole("menuitem", { name: "Edit details" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Quantity").fill("3");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await toast("Changes saved");
  await page.locator("li", { hasText: "Avocado" }).first().getByText("3 pcs").waitFor();
});

await step("throw away part of a product → waste log", async () => {
  const row = page.locator("li", { hasText: "Avocado" }).first();
  await row.getByRole("button", { name: /More actions/ }).click();
  await page.getByRole("menuitem", { name: "Throw away…" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: /Some of it/ }).click();
  await dialog.getByLabel(/Amount/).fill("1");
  await dialog.getByRole("button", { name: /Log & remove/ }).click();
  await toast("waste record");
  await page.locator("li", { hasText: "Avocado" }).first().getByText("2 pcs").waitFor();
});

await step("mark as used and delete", async () => {
  let row = page.locator("li", { hasText: "Avocado" }).first();
  await row.getByRole("button", { name: /More actions/ }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Delete Avocado/ }).click();
  await toast("Removed from inventory");
  await page.getByText("Avocado", { exact: true }).waitFor({ state: "detached" });
});

await step("use-soon view", async () => {
  await go(`/app/expiring`);
  await page.getByRole("heading", { name: "Use within 3 days" }).waitFor();
  await shot("expiring");
});

await step("meal suggestions explain themselves", async () => {
  await go(`/app/meals`);
  await page.getByText(/Uses up/).first().waitFor();
  await shot("meals");
  await go(`/app/meals/shakshuka`);
  await page.getByRole("heading", { name: "Weeknight shakshuka" }).waitFor();
  await shot("recipe");
  const add = page.getByRole("button", { name: /missing to list/ });
  if (await add.count()) {
    await add.click();
    await toast("added to your list");
  }
});

await step("shopping: add, block duplicate, buy, put away", async () => {
  await go(`/app/shopping`);
  await page.getByLabel("Item").fill("Oat milk");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await toast("Oat milk added");
  await page.getByLabel("Item").fill("lemon");
  await page.getByText(/already on your list/).waitFor();
  await page.getByLabel("Item").fill("");
  await page.getByRole("checkbox", { name: /Oat milk/ }).check();
  await page.getByRole("button", { name: /Put 1 away/ }).waitFor({ timeout: 15000 });
  await shot("shopping");
  await page.getByRole("button", { name: /Put 1 away/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Add 1 to inventory/ }).click();
  await toast("moved to your inventory");
  await go(`/app/inventory?q=oat`);
  await page.getByText("Oat milk").first().waitFor();
});

await step("waste log with stats", async () => {
  await go(`/app/waste`);
  await page.getByRole("heading", { name: "Items thrown away per week" }).waitFor();
  await page.getByRole("button", { name: /Log thrown-away food/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("What was it?").fill("Leftover soup");
  await dialog.getByLabel(/Cost/).fill("2.50");
  await dialog.getByRole("button", { name: "Add to waste log" }).click();
  await toast("Added to your waste log");
  await page.getByText("Leftover soup").first().waitFor();
  await shot("waste");
});

await step("Savi: welcome, rescue XP, mission, level-up, settings", async () => {
  await go(`/app`);
  const xpNow = async () => {
    await go(`/app/savi`);
    return Number((await page.locator("span.font-display", { hasText: "XP" }).first().textContent()).replace(/\D/g, ""));
  };
  await page.getByRole("button", { name: /Savi, your kitchen companion/ }).waitFor();
  const before = await xpNow();
  // Rescue: use an item that is within 3 days of its date.
  await go(`/app/inventory`);
  await page.getByRole("button", { name: "Mark all Ripe bananas as used" }).click();
  await page.getByRole("status").filter({ hasText: "Nice save" }).first().waitFor({ timeout: 15000 });
  const afterRescue = await xpNow();
  if (afterRescue - before !== 45) throw new Error(`rescue should add 15 + 30 mission XP, got ${afterRescue - before}`);
  await page.locator("li", { hasText: "Rescue one item" }).getByText("Done").waitFor();
  // Cook a recipe: +20 and the cook mission (+30) take Savi past 60 XP to Sprout.
  await go(`/app/meals/spinach-feta-omelette`);
  await page.getByRole("button", { name: "I cooked this" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Update inventory" }).click();
  await page.getByRole("status").filter({ hasText: /grown into Sprout|Mission complete|Cooked from what you had/ }).first().waitFor({ timeout: 15000 });
  const afterCook = await xpNow();
  // +20 cooked, +30 mission, plus rescue XP for omelette ingredients within 3 days of their date
  if (afterCook - afterRescue < 50) throw new Error(`cooking should add at least 50 XP, got ${afterCook - afterRescue}`);
  await page.locator("li", { hasText: "Cook from your kitchen" }).getByText("Done").waitFor();
  await shot("savi");
  // Settings: hide and restore.
  await page.getByText("Hidden", { exact: true }).click();
  await toast("Savi is hidden");
  await page.getByRole("button", { name: /Savi, your kitchen companion/ }).waitFor({ state: "detached" });
  await page.getByText("Lively", { exact: true }).click();
  await toast("back to normal");
  await page.getByRole("button", { name: /Savi, your kitchen companion\. Stage [2-7]/ }).waitFor();
});

await step("Predictive Kitchen: patterns, waste risk, smart quantity", async () => {
  await go(`/app/predict`);
  await page.getByRole("heading", { name: "Your patterns" }).waitFor();
  await page
    .locator("li", { hasText: "Greek yogurt" })
    .filter({ hasText: /High risk|Watch/ })
    .first()
    .waitFor({ timeout: 10000 })
    .catch(async (e) => {
      console.log((await page.locator("main").innerText()).slice(0, 900));
      throw e;
    });
  const milk = page.locator("li", { hasText: /milk/i }).filter({ hasText: /Bought \d+ times/ }).first();
  await milk.waitFor();
  await shot("predict");
  await milk.getByRole("button", { name: /on the list/ }).click();
  await toast(/smarter amount|Updated/);
  await go(`/app/shopping`);
  await page.getByText("Smart quantity from your history").first().waitFor();
  await page.getByLabel("Item").fill("bananas");
  await page.getByText(/Predictive Kitchen: you usually buy/).waitFor();
  await page.getByRole("button", { name: /^Use / }).click();
  await page.getByLabel("Item").fill("");
  await go(`/app/inventory`);
  await page.getByText("May go unused").first().waitFor();
});

await step("data persists after reload", async () => {
  await go(`/app/waste`);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.getByText("Leftover soup").first().waitFor();
});

for (const [name, viewport] of [
  ["tablet", { width: 1024, height: 1366 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  await step(`responsive ${name}`, async () => {
    await page.setViewportSize(viewport);
    for (const path of ["/app", "/app/inventory", "/app/meals", "/app/shopping", "/app/waste"]) {
      await go(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) throw new Error(`${path} overflows horizontally by ${overflow}px at ${name}`);
      await shot(`${name}${path.replaceAll("/", "-")}`);
    }
  });
}

await step("sign out", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await go(`/app`);
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await page.waitForURL(BASE + "/");
});

await browser.close();
const relevant = errors.filter((e) => !/favicon|Download the React DevTools/.test(e));
if (relevant.length) {
  console.log("\nBrowser errors:\n" + relevant.join("\n"));
  process.exitCode = 1;
} else {
  console.log("\nAll steps passed with no browser errors.");
}
