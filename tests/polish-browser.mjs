// Run with a local Vite server and Playwright installed. Every backend request is
// intercepted; this exercises the actual adapter without production mutations.
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
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
  needsRefill: n > 35 && n < 40,
}));
const inks = (await read("../src/data/inks.json"))
  .filter((i) => i.id !== "NONE")
  .map((i, n) => ({
    ...i,
    archived: false,
    favorite: false,
    colorHex: [
      "#407873",
      "#197695",
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
  notPure: n === 2,
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
const writes = [];
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
  else {
    assert.ok(owner, "Public cannot mutate");
    writes.push({ name, body });
    if (name === "save_writing_log") {
      const existing = state.writingLogs.find(
        (x) =>
          x.id === body.p_id ||
          (x.refillId === body.p_refill_id &&
            x.writtenOn === body.p_written_on),
      );
      const item = {
        id: existing?.id || `writing-new-${writes.length}`,
        refillId: body.p_refill_id,
        writtenOn: body.p_written_on,
      };
      state.writingLogs = state.writingLogs
        .filter((x) => x.id !== item.id)
        .concat(item);
      result = { item };
    } else throw Error(`Unexpected backend request: ${url.pathname}`);
  }
  await route.fulfill({ json: result });
});
try {
  await mkdir(".artifacts/ui-polish", { recursive: true });
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
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole("link", { name: "My desk", exact: true }).click();
    const swatch = page.getByRole("button", {
      name: `${inks[0].brand} ${inks[0].name}`,
      exact: true,
    });
    await swatch.click({ position: { x: 50, y: 140 } });
    await page.locator(".selected-pen-details").waitFor();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `.artifacts/ui-polish/desk-${width}.png` });
    if (width === 1440) {
      const sizes = await page
        .locator(".desk-shell *")
        .evaluateAll((elements) =>
          [
            ...new Set(
              elements
                .filter(
                  (el) =>
                    el.getBoundingClientRect().width &&
                    [...el.childNodes].some(
                      (node) => node.nodeType === 3 && node.textContent.trim(),
                    ),
                )
                .map((el) => getComputedStyle(el).fontSize),
            ),
          ].sort(),
        );
      await writeFile(
        ".artifacts/ui-polish/typography.json",
        JSON.stringify(sizes),
      );
    }

    await page
      .locator(".selected-panel")
      .screenshot({ path: `.artifacts/ui-polish/sidebar-${width}.png` });
    await page
      .getByRole("button", { name: "View writing history", exact: true })
      .click();
    const modal = page.getByRole("dialog", {
      name: "Writing history",
      exact: true,
    });
    await modal.waitFor();
    await modal.screenshot({
      path: `.artifacts/ui-polish/writing-${width}.png`,
    });
    assert.ok(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth));
    await modal
      .getByRole("button", { name: "Log writing", exact: true })
      .click();
    await modal.getByText("Writing day saved.", { exact: true }).waitFor();
    await page.keyboard.press("Escape");
    for (const kind of ["Pens", "Inks"]) {
      await page.getByRole("link", { name: kind, exact: true }).click();
      const group = page.getByRole("group", { name: "Filter by brand" });
      const chip = group.locator(".brand-chip").nth(1);
      const brand = (await chip.innerText()).trim();
      await chip.focus();
      await page.keyboard.press("Enter");
      assert.equal(await chip.getAttribute("aria-pressed"), "true");
      const rows = page.locator(".collection-row");
      assert.ok(await rows.count());
      assert.ok(
        (await rows.allTextContents()).every((text) => text.includes(brand)),
      );
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `.artifacts/ui-polish/${kind.toLowerCase()}-${width}.png`,
      });
      await page.getByRole("searchbox").fill("zz-no-match");
      await page.getByText(/No .* match/).waitFor();
      await page.screenshot({
        path: `.artifacts/ui-polish/empty-${kind.toLowerCase()}-${width}.png`,
      });
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .first()
        .click();
      assert.equal(
        await group
          .getByRole("button", { name: "All brands", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(await page.getByRole("searchbox").inputValue(), "");
      const more = page.getByRole("button", { name: /More brands/ });
      if (await more.count()) {
        await more.click();
        assert.equal(
          await page
            .getByRole("button", { name: "Fewer brands" })
            .getAttribute("aria-expanded"),
          "true",
        );
        await page.screenshot({
          path: `.artifacts/ui-polish/brands-${kind.toLowerCase()}-${width}.png`,
        });
        await group.locator(".brand-chip").last().click();
        await page.getByRole("button", { name: "Fewer brands" }).click();
        assert.equal(
          await group.locator('.brand-chip[aria-pressed="true"]').count(),
          1,
        );
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: synthetic writing save; brand keyboard selection, combined search, empty/reset, expansion; desktop/mobile no overflow.",
  );
} finally {
  await browser.close();
}
