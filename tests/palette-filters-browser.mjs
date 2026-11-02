// Run with a local Vite server and Playwright installed. Every backend request is
// intercepted; this exercises the actual adapter without production mutations.
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
});
const read = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const pens = (await read("../src/data/pens.json")).map((p, n) => ({
  ...p,
  archived: false,
  favorite: false,
  needsRefill: n === 1 || (n > 35 && n < 40),
}));
Object.assign(pens[0], {
  brand: "TWSBI",
  model: "Eco",
  color: "Transparent Yellow",
  nibSize: "Stub 1.1mm",
  nibType: "Steel",
});
Object.assign(pens[1], {
  brand: "Sailor",
  model: "Professional Gear",
  color: "Midnight Blue with Silver Shimmer",
  nibSize: "Medium Fine",
  nibType: "Gold, 21k",
});
Object.assign(pens[31], {
  brand: "Pilot",
  model: "Custom 74",
  color: "",
  nibSize: "",
  nibType: "",
});
const inks = (await read("../src/data/inks.json"))
  .filter((i) => i.id !== "NONE")
  .map((i, n) => ({
    ...i,
    archived: false,
    favorite: false,
    colorHex: [
      "#f3d51b",
      "#173a69",
      "#32589c",
      "#706295",
      "#ab6d9d",
      "#bf665e",
      "#cf914f",
      "#8d993f",
    ][n % 8],
  }));
inks[3].name = "Blue";
inks[4].name = "[Day 23] Let it Snow — A Very Long Winter Evening Ink Name";
inks[4].details =
  "Synthetic reference notes for browsing. No production data is changed.";
const events = pens.slice(0, 36).map((p, n) => ({
  id: `event-${n}`,
  sequence: String(n + 1),
  kind: "refill",
  penId: p.id,
  date: "2026-10-01",
  inkIds:
    n === 1
      ? [inks[0].id]
      : n === 2
        ? [inks[1].id, inks[2].id]
        : [inks[n % 31].id],
  notPure: n === 1 || n === 2,
  notes: "",
}));
pens[35].archived = true;
events[34].inkIds = [];
events[34].kind = "cleaning";
const state = {
  pens,
  inks,
  events,
  asOf: today,
  writingLogs: [
    { id: "writing-1", refillId: "event-0", writtenOn: "2026-10-05" },
  ],
  palettes: [
    {
      id: "default",
      name: "Everyday spectrum",
      items: inks.slice(0, 31).map((i) => ({ inkId: i.id, omitted: false })),
    },
  ],
};
let owner = false;
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.error(e.stack);
});
await page.route("**/*", async (route) => {
  const request = route.request(),
    url = new URL(request.url());
  if (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    return route.continue();
  const name = url.pathname.split("/").at(-1),
    body = request.postDataJSON() || {};
  let result;
  if (url.pathname.includes("/auth/v1/token")) {
    owner = body.email !== "viewer@example.test";
    const id = "00000000-0000-4000-8000-000000000001";
    const token = `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.synthetic`;
    result = {
      access_token: token,
      refresh_token: "synthetic",
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id,
        email: "owner@example.test",
        aud: "authenticated",
        app_metadata: {},
        user_metadata: {},
      },
    };
  } else if (name === "logout") {
    owner = false;
    result = {};
  } else if (name === "get_collection") result = { ...state, canEdit: owner };
  else throw Error(`Unexpected backend request: ${url.pathname}`);
  await route.fulfill({ json: result });
});
try {
  await mkdir(".artifacts/palette-filters", { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(process.env.DESK_URL || "http://127.0.0.1:5196/");
  await page.getByLabel("Palette", { exact: true }).waitFor();
  const clickSwatch = async () => {
    const swatch = page.locator(".desk-swatch").first();
    await swatch.click({ position: { x: 35, y: 100 } });
    return swatch;
  };
  const swatch = await clickSwatch();
  const before = await swatch.boundingBox();
  await swatch.hover();
  assert.deepEqual(await swatch.boundingBox(), before);
  await clickSwatch();
  assert.equal(await swatch.getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "View ink", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Ink details", exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(await swatch.getAttribute("aria-pressed"), "true");
  await page.screenshot({
    path: ".artifacts/palette-filters/desktop-palette.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("dialog", { name: "Blue Peppermint", exact: true })
    .waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await clickSwatch();
  const modal = page.locator(".palette-selection-dialog");
  await modal.waitFor();
  assert.equal(
    await modal.getByText("Selected ink", { exact: true }).count(),
    0,
  );
  assert.equal(
    await modal.locator(".sidebar-header h2").innerText(),
    "Blue Peppermint",
  );
  await page.screenshot({
    path: ".artifacts/palette-filters/mobile-palette.png",
  });
  assert.ok(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth));
  await modal.getByRole("button", { name: "View ink", exact: true }).click();
  const inkModal = page.getByRole("dialog", {
    name: "Ink details",
    exact: true,
  });
  await inkModal.waitFor();
  await page.keyboard.press("Escape");
  await inkModal.waitFor({ state: "hidden" });
  await modal.waitFor();
  await page.goBack();
  await modal.waitFor({ state: "hidden" });
  await clickSwatch();
  await page.keyboard.press("Escape");
  await modal.waitFor({ state: "hidden" });
  await page.waitForTimeout(100);
  assert.ok(await swatch.evaluate((el) => el === document.activeElement));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const kind of ["Pens", "Inks"]) {
      await page.getByRole("link", { name: kind, exact: true }).click();
      const chips = page.locator(".brand-chip");
      const labels = await chips.allTextContents();
      const counts = new Map();
      for (const item of kind === "Pens" ? pens : inks)
        if (!item.archived)
          counts.set(item.brand, (counts.get(item.brand) || 0) + 1);
      const expected = [...counts.keys()]
        .sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b))
        .slice(0, 5);
      assert.deepEqual(labels, expected);
      const positions = await chips.evaluateAll((els) =>
        els.map((el) => ({
          x: el.offsetLeft,
          y: el.offsetTop,
          width: el.offsetWidth,
        })),
      );
      const listTop = await page
        .locator(".collection-list")
        .evaluate((el) => el.offsetTop);
      await chips.first().click();
      assert.deepEqual(await chips.allTextContents(), labels);
      assert.deepEqual(
        await chips.evaluateAll((els) =>
          els.map((el) => ({
            x: el.offsetLeft,
            y: el.offsetTop,
            width: el.offsetWidth,
          })),
        ),
        positions,
      );
      assert.equal(
        await page.locator(".collection-list").evaluate((el) => el.offsetTop),
        listTop,
      );
      await page.getByRole("button", { name: "In use", exact: true }).click();
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `.artifacts/palette-filters/${kind.toLowerCase()}-${width}.png`,
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .first()
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "In use", exact: true })
          .getAttribute("aria-pressed"),
        "false",
      );
      await page.getByRole("button", { name: "In use", exact: true }).click();
      const activeEvents = events.filter(
        (e) => e.inkIds.length && !pens.find((p) => p.id === e.penId).archived,
      );
      const expectedInUse =
        kind === "Pens"
          ? activeEvents.length
          : new Set(activeEvents.flatMap((e) => e.inkIds)).size;
      assert.equal(
        await page.locator(".collection-row").count(),
        expectedInUse,
      );
      await page
        .getByRole("button", { name: "Include archived", exact: true })
        .click();
      assert.equal(
        await page.locator(".collection-row").count(),
        expectedInUse,
      );
      await page.getByRole("searchbox").fill("zzzzz");
      await page.getByText(/No .* match/).waitFor();
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .first()
        .click();
    }
  }
  await page.getByRole("link", { name: "My desk", exact: true }).click();
  await page
    .getByRole("button", { name: "Owner sign in", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).waitFor();
  await page.getByLabel("Palette", { exact: true }).click();
  await page.getByRole("option", { name: "Everyday spectrum" }).click();
  await page.getByRole("button", { name: /Actions for/ }).click();
  await page
    .getByRole("menuitem", { name: "Edit palette", exact: true })
    .click();
  await page
    .getByLabel("Edit palette", { exact: true })
    .fill("Unsaved review palette");
  const last = page.locator(".desk-swatch").last();
  await last.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => scrollY);
  await last.click({ position: { x: 35, y: 100 } });
  await modal.waitFor();
  await page.keyboard.press("Tab");
  assert.ok(await modal.evaluate((el) => el.contains(document.activeElement)));
  await page.screenshot({
    path: ".artifacts/palette-filters/mobile-owner.png",
  });
  await page.keyboard.press("Escape");
  await modal.waitFor({ state: "hidden" });
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => scrollY), scrollBefore);
  assert.equal(
    await page.getByLabel("Edit palette", { exact: true }).inputValue(),
    "Unsaved review palette",
  );
  await last.click({ position: { x: 35, y: 100 } });
  await modal.waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await modal.waitFor({ state: "hidden" });
  assert.equal(await last.getAttribute("aria-pressed"), "true");
  await page.setViewportSize({ width: 390, height: 600 });
  await modal.waitFor();
  await modal.evaluate((el) => (el.scrollTop = el.scrollHeight));
  assert.ok(await modal.evaluate((el) => el.scrollHeight >= el.clientHeight));
  await page.keyboard.press("Escape");
  await modal.waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
  console.log(
    "Palette modal and collection filters passed; screenshots saved.",
  );
} finally {
  await browser.close();
}
