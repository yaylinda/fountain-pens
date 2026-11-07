// Run against a local Vite server with synthetic public config and Playwright.
// All backend requests are intercepted; no production collection is accessed.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const pens = [
  ["Queued", true, false],
  ["Clean", false, false],
  ["Both", true, false],
  ["Refilled", false, false],
  ["Unrecorded", false, false],
  ["Archived", false, true],
].map(([model, needsRefill, archived], i) => ({
  id: model, brand: i === 1 ? "Sailor" : "Pilot", model,
  color: "Blue", nibSize: "Fine", nibType: "Steel", needsRefill, archived, favorite: false,
}));
const event = (penId, kind, sequence) => ({
  id: `event-${sequence}`, penId, kind, sequence: String(sequence),
  date: "2026-10-01", inkIds: kind === "cleaning" ? [] : ["ink"], notes: "", notPure: false,
});
const state = {
  pens,
  inks: [{ id: "ink", brand: "Pilot", name: "Blue", collection: "", colorHex: "#32589c", archived: false, favorite: false }],
  events: [event("Queued", "refill", 1), event("Clean", "cleaning", 2),
    event("Both", "cleaning", 3), event("Refilled", "cleaning", 4),
    event("Refilled", "refill", 5), event("Archived", "cleaning", 6)],
  asOf: "2026-11-07", canEdit: false, writingLogs: [], palettes: [],
};
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
  assert.ok(url.pathname.endsWith("/rpc/get_collection"), `Unexpected request: ${url.pathname}`);
  await route.fulfill({ json: state });
});
const toggle = page.getByRole("button", { name: "Needs refill or cleaned & empty", exact: true });
const clear = page.getByRole("button", { name: "Clear filters", exact: true }).first();
const rows = page.locator(".collection-row");
const expectPens = async (names) => {
  await page.waitForFunction((count) => document.querySelectorAll(".collection-row").length === count, names.length);
  const text = await rows.allTextContents();
  for (const name of names) assert.ok(text.some((row) => row.includes(name)), `${name} is shown`);
};
try {
  await mkdir(".artifacts/pen-status-filter", { recursive: true });
  await page.goto(process.env.DESK_URL || "http://127.0.0.1:5196/");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.getByRole("link", { name: "Pens", exact: true }).click();
    await expectPens(["Queued", "Clean", "Both", "Refilled", "Unrecorded"]);
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "true");
    await expectPens(["Queued", "Clean", "Both"]);
    await page.screenshot({ path: `.artifacts/pen-status-filter/pens-${width}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole("checkbox", { name: "Include archived" }).click();
    await expectPens(["Queued", "Clean", "Both", "Archived"]);
    await page.getByRole("searchbox").fill("archived");
    await expectPens(["Archived"]);
    await page.getByRole("searchbox").fill("");
    await page.getByRole("checkbox", { name: "Sailor", exact: true }).click();
    await expectPens(["Clean"]);
    await clear.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");
    await expectPens(["Queued", "Clean", "Both", "Refilled", "Unrecorded"]);
    await toggle.click();
    await page.getByRole("button", { name: "In use", exact: true }).click();
    await expectPens(["Queued"]);
    await clear.click();
    await page.getByRole("link", { name: "Inks", exact: true }).click();
    assert.equal(await toggle.count(), 0);
  }
  assert.deepEqual(errors, []);
  console.log("PASS combined pen filter: union, latest status, archive/search/brand/in-use, clear, desktop/mobile, pens only");
} finally {
  await browser.close();
}
