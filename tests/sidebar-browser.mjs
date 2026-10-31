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
  await mkdir(".artifacts/pen-consistency", { recursive: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(process.env.DESK_URL || "http://127.0.0.1:5192/");
  await page.getByLabel("Palette", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Owner sign in", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).waitFor();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1200 : 1000 });
    for (const [name, n] of [
      ["multi", 0],
      ["single", 5],
      ["long", 4],
    ]) {
      const swatch = page.getByRole("button", {
        name: `${inks[n].brand} ${inks[n].name}`,
        exact: true,
      });
      const bounds = await swatch.boundingBox();
      await swatch.click({
        position: { x: bounds.width / 2, y: bounds.height - 16 },
      });
      await swatch.click({
        position: { x: bounds.width / 2, y: bounds.height - 16 },
      });
      assert.equal(await swatch.getAttribute("aria-pressed"), "true");
      assert.equal(
        await page.locator(".selected-panel").getAttribute("aria-hidden"),
        "false",
      );
      const detail = page.locator(".selected-pen-details");
      await detail.waitFor();
      if (name === "multi") {
        const choices = page.locator(".pen-choice-info");
        assert.equal(
          await choices.getByText("Queued for refill", { exact: true }).count(),
          1,
        );
        assert.equal(
          await choices.getByText("Residual ink", { exact: true }).count(),
          1,
        );
      }
      assert.equal(
        await detail
          .locator(".sidebar-section")
          .evaluate((el) => getComputedStyle(el).borderTopWidth),
        "1px",
      );
      assert.ok(
        await detail
          .getByRole("button", { name: "Log writing today", exact: true })
          .locator("svg")
          .count(),
      );
      assert.ok(
        await detail
          .getByRole("button", { name: "View writing history", exact: true })
          .locator("svg")
          .count(),
      );
      const dimensions = await page.locator(".desk-swatch").evaluateAll((els) =>
        els.map((el) => ({
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
          track: el
            .closest(".swatch-card")
            .parentElement.getBoundingClientRect().width,
        })),
      );
      assert.ok(
        dimensions.every((d) => Math.abs(d.width - d.track) < 1),
        "swatches must fill their grid track",
      );
      assert.ok(
        Math.max(...dimensions.map((d) => d.width)) -
          Math.min(...dimensions.map((d) => d.width)) <
          1,
        "equal card widths",
      );
      assert.ok(
        dimensions.every((d) => d.height === 160),
        `consistent card heights: ${JSON.stringify(dimensions)}`,
      );
      const colors = await page
        .locator(".swatch-face")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
      assert.ok(colors.every((c) => c === "rgba(255, 255, 255, 0.85)"));
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const refill = detail.getByRole("button", {
        name: "Log refill",
        exact: true,
      });
      assert.equal(
        await refill.evaluate((el) => getComputedStyle(el).whiteSpace),
        "nowrap",
      );
      assert.ok(
        await refill.evaluate((el) => el.scrollWidth <= el.clientWidth),
      );
      assert.equal(await page.locator("button a, a button").count(), 0);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(250);
      await page.locator(".selected-panel").screenshot({
        path: `.artifacts/pen-consistency/sidebar-${name}-${width}.png`,
      });
      const identities = async (locator) =>
        locator.evaluateAll((els) =>
          els.map((el) => ({
            text: el.textContent,
            colorSize: getComputedStyle(el.querySelector(".pen-color"))
              .fontSize,
            colorWeight: getComputedStyle(el.querySelector(".pen-color"))
              .fontWeight,
            summarySize: getComputedStyle(el.querySelector(".pen-summary"))
              .fontSize,
            modelSize: getComputedStyle(el.querySelector(".object-name"))
              .fontSize,
            gap: getComputedStyle(el).gap,
          })),
        );
      const paletteIdentities = await identities(
        page.locator(".selected-panel .pen-identity-color"),
      );
      await page.getByRole("button", { name: "View ink", exact: true }).click();
      const comparison = page.getByRole("dialog", {
        name: "Ink details",
        exact: true,
      });
      await comparison.waitFor();
      assert.deepEqual(
        await identities(
          comparison.locator(".sidebar-pen .pen-identity-color"),
        ),
        paletteIdentities,
      );
      assert.equal(await comparison.locator(".pen-fill-badges").count(), 0);
      assert.equal(await comparison.locator(".sidebar-pen .status").count(), 0);
      assert.ok(
        await comparison.evaluate((el) => el.scrollWidth <= el.clientWidth),
      );
      await comparison.screenshot({
        path: `.artifacts/pen-consistency/details-${name}-${width}.png`,
      });
      await comparison
        .getByRole("button", { name: "Close", exact: true })
        .click();
      await comparison.waitFor({ state: "detached" });
      if (width === 1440) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: `.artifacts/pen-consistency/${name}-${width}.png`,
        });
      }
    }
    if (width === 390) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: ".artifacts/pen-consistency/grid-390.png",
      });
    }
    const snapshot = async () => ({
      selected: await page
        .locator('.desk-swatch[aria-pressed="true"]')
        .getAttribute("aria-label"),
      order: await page
        .locator(".desk-swatch")
        .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label"))),
      scroll: await page.evaluate(() => scrollY),
    });
    const link = page.getByRole("link", {
      name: `View ink details: ${inks[4].brand} ${inks[4].name}`,
      exact: true,
    });
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    const before = await snapshot();
    await page.keyboard.press("Enter");
    const modal = page.getByRole("dialog", {
      name: "Ink details",
      exact: true,
    });
    await modal.waitFor();
    await modal.getByText(inks[4].details, { exact: true }).waitFor();
    assert.ok(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth));
    await modal.screenshot({
      path: `.artifacts/pen-consistency/ink-details-${width}.png`,
    });
    await modal.getByRole("button", { name: "Close", exact: true }).click();
    await modal.waitFor({ state: "detached" });
    await page.waitForTimeout(100);
    assert.deepEqual(await snapshot(), before);
    await page.getByRole("button", { name: "View ink", exact: true }).click();
    await modal.waitFor();
    await page.goBack();
    await modal.waitFor({ state: "detached" });
    assert.equal((await snapshot()).selected, before.selected);
    await page.goForward();
    await modal.waitFor();
    await page.keyboard.press("Escape");
    await modal.waitFor({ state: "detached" });
    const selectedSwatch = page.locator('.desk-swatch[aria-pressed="true"]');
    await selectedSwatch.focus();
    await page.keyboard.press("Enter");
    assert.equal(await selectedSwatch.count(), 1);
    assert.equal(
      await page.locator(".selected-panel").getAttribute("aria-hidden"),
      "false",
    );
    await page
      .getByRole("button", { name: "Deselect ink", exact: true })
      .click();
    assert.equal(
      await page.locator('.desk-swatch[aria-pressed="true"]').count(),
      0,
    );
    assert.equal(
      await page.locator(".selected-panel").getAttribute("aria-hidden"),
      "true",
    );
  }
  // Open details while editing a saved palette; keep an unsaved keyboard reorder.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Palette", { exact: true }).click();
  await page
    .getByRole("option", { name: "Everyday spectrum", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Actions for Everyday spectrum", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Edit palette", exact: true })
    .click();
  const order = () =>
    page
      .locator(".desk-swatch")
      .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  const originalOrder = await order();
  const handle = page.getByRole("button", {
    name: `Move ${originalOrder[0]}`,
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(120);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(120);
  await page.keyboard.press("Space");
  await page.waitForTimeout(120);
  const reordered = await order();
  assert.notDeepEqual(reordered, originalOrder);
  await page
    .getByRole("link", {
      name: `View ink details: ${reordered[0]}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog", { name: "Ink details", exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.deepEqual(await order(), reordered);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.deepEqual(await order(), originalOrder);
  await page.getByRole("link", { name: "Refills", exact: true }).click();
  assert.equal(
    await page.getByText("Refill & cleaning history", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByText("Past fills and cleanings.", { exact: false }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS synthetic owner: white light/dark cards, single/multiple pens, icons, divider, long names, desktop/mobile, removed copy; no writes",
  );
} finally {
  await browser.close();
}
