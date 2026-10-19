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
let owner = false,
  failNext = false;
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
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
    if (failNext) {
      failNext = false;
      return route.fulfill({
        status: 400,
        json: { code: "22023", message: "Invalid fields" },
      });
    }
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
    } else if (name === "delete_writing_log") {
      state.writingLogs = state.writingLogs.filter((x) => x.id !== body.p_id);
      result = { deletedId: body.p_id };
    } else if (name === "save_named_palette") {
      const palette = {
        id: body.p_id || `palette-${writes.length}`,
        name: body.p_name,
        items: body.p_items,
      };
      state.palettes = state.palettes
        .filter((p) => p.id !== palette.id)
        .concat(palette);
      result = { palette };
    } else if (name === "delete_named_palette") {
      state.palettes = state.palettes.filter((p) => p.id !== body.p_id);
      result = { deletedId: body.p_id };
    } else if (
      name === "create_refill_event" ||
      name === "update_refill_event"
    ) {
      const previous = state.events.find((e) => e.id === body.p_event_id);
      const { queueAfterCleaning, ...fields } = body.p_entry;
      const event = {
        ...fields,
        id: previous?.id || `event-new-${writes.length}`,
        sequence: previous?.sequence || String(state.events.length + 1),
      };
      state.events = state.events
        .filter((e) => e.id !== event.id)
        .concat(event);
      const pen = state.pens.find((p) => p.id === event.penId);
      if (!previous)
        pen.needsRefill =
          event.kind === "cleaning"
            ? (queueAfterCleaning ?? pen.needsRefill)
            : false;
      result = { event, pen: { id: pen.id, needsRefill: pen.needsRefill } };
    } else throw Error(`Unexpected backend request: ${url.pathname}`);
  }
  await route.fulfill({ json: result });
});
try {
  await page.goto(process.env.DESK_URL || "http://127.0.0.1:5188/");
  await page
    .getByRole("button", { name: "Everyday spectrum", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Edit palette", exact: true })
      .count(),
    0,
  );
  assert.equal(await page.title(), "Fountain Pens · My desk");
  assert.equal(
    await page.getByRole("link", { name: /Full collection/ }).count(),
    0,
  );
  await mkdir("docs/verification/desk-iteration", { recursive: true });
  await page.screenshot({
    path: "docs/verification/desk-iteration/public-desktop.png",
    fullPage: false,
  });
  await page.goto(new URL("/index.html", page.url()).href);
  await page
    .getByRole("button", { name: "Everyday spectrum", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Everyday spectrum", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Owner sign in", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit palette", exact: true })
    .waitFor();
  await page
    .getByRole("button", {
      name: `${inks[0].brand} ${inks[0].name}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Wrote today", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Wrote today", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("button", { name: "Wrote today", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "✓ Written today", exact: true })
    .waitFor();
  assert.equal(
    state.writingLogs.filter((l) => l.writtenOn === today).length,
    1,
  );
  const otherPen = pens[1];
  await page
    .getByRole("button", {
      name: `${otherPen.brand} ${otherPen.model} · ${otherPen.color} · ${otherPen.nibSize}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Wrote today", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Wrote today", exact: true })
      .count(),
    1,
  );
  assert.equal(
    state.writingLogs.filter((l) => l.refillId === "event-1").length,
    0,
  );
  const originalPen = pens[0];
  await page
    .getByRole("button", {
      name: `${originalPen.brand} ${originalPen.model} · ${originalPen.color} · ${originalPen.nibSize}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Writing history", exact: true })
    .first()
    .click();
  await page.getByLabel("Add writing day").fill("2026-10-06");
  await page
    .getByRole("button", { name: "Save writing day", exact: true })
    .click();
  await page.getByText("Writing day saved.", { exact: true }).waitFor();
  const row = page.getByText("2026-10-06", { exact: true }).locator("..");
  await row.getByRole("button", { name: "Correct", exact: true }).click();
  await page.getByLabel("Correct date").fill("2026-10-07");
  await page
    .getByRole("button", { name: "Save correction", exact: true })
    .click();
  await page.getByText("2026-10-07", { exact: true }).waitFor();
  await mkdir("docs/verification/desk-iteration", { recursive: true });
  await page.screenshot({
    path: "docs/verification/desk-iteration/connected-writing.png",
  });
  await page
    .getByText("2026-10-07", { exact: true })
    .locator("..")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await page.getByText("Writing day deleted.", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent),
    "Writing history",
  );
  await page.getByRole("button", { name: "Edit palette", exact: true }).click();
  await page.getByLabel("Palette name").fill("Edited spectrum");
  const first = page.locator(".desk-swatch").first();
  const label = await first.getAttribute("aria-label");
  await page
    .getByRole("button", { name: `Move ${label}`, exact: true })
    .focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(120);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(120);
  await page.keyboard.press("Space");
  await page.waitForTimeout(120);
  assert.notEqual(await first.getAttribute("aria-label"), label);
  await page
    .getByRole("button", { name: `Omit ${label}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Save palette", exact: true }).click();
  await page
    .getByRole("button", { name: "Edited spectrum", exact: true })
    .waitFor();
  assert.equal(
    state.palettes[0].items.find((i) => i.inkId === inks[0].id).omitted,
    true,
  );
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await page.getByLabel("Palette name").fill("Copy");
  await page.getByRole("button", { name: "Save palette", exact: true }).click();
  await page.getByRole("button", { name: "Copy", exact: true }).waitFor();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await page.getByText("Palette deleted.", { exact: true }).waitFor();
  assert.equal(state.palettes.length, 1);
  await page.getByRole("button", { name: "Edit palette", exact: true }).click();
  await page
    .getByRole("button", { name: `Restore ${inks[0].name}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Save palette", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit palette", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "+ Refill or clean a pen", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Refill or clean",
    exact: true,
  });
  assert.match(
    await modal.locator(".desk-options button").first().innerText(),
    /Needs refill/,
  );
  await modal.locator(".desk-options button").first().click();
  await page
    .getByLabel("Inks · select more than one to mix")
    .fill(inks[0].name);
  await modal
    .getByRole("button", {
      name: `${inks[0].brand} ${inks[0].name}`,
      exact: true,
    })
    .click();
  await page
    .getByLabel("Inks · select more than one to mix")
    .fill(inks[1].name);
  await modal
    .getByRole("button", {
      name: `${inks[1].brand} ${inks[1].name}`,
      exact: true,
    })
    .click();
  await page.getByLabel("Notes", { exact: true }).fill("Synthetic mix");
  failNext = true;
  await page.getByRole("button", { name: "Save refill", exact: true }).click();
  await modal.getByRole("alert").waitFor();
  assert.equal(
    await page.getByLabel("Notes", { exact: true }).inputValue(),
    "Synthetic mix",
  );
  await page.getByRole("button", { name: "Save refill", exact: true }).click();
  await modal.waitFor({ state: "detached" });
  assert.equal(state.events.at(-1).inkIds.length, 2);
  await page
    .getByRole("button", { name: "+ Refill or clean a pen", exact: true })
    .click();
  await modal.locator(".desk-options button").first().click();
  await page
    .getByRole("button", { name: "Cleaned & empty", exact: true })
    .click();
  await page.getByRole("button", { name: "Save refill", exact: true }).click();
  await modal.waitFor({ state: "detached" });
  assert.equal(state.events.at(-1).kind, "cleaning");
  assert.equal(state.events.at(-1).inkIds.length, 0);
  const cleanedId = state.events.at(-1).id;
  await page.getByRole("link", { name: "Activity", exact: true }).click();
  await page
    .getByRole("button", { name: "Correct refill", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Corrected synthetic cleaning");
  await page.getByRole("button", { name: "Save refill", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Correct refill", exact: true })
    .waitFor({ state: "detached" });
  assert.equal(
    state.events.find((e) => e.id === cleanedId).notes,
    "Corrected synthetic cleaning",
  );

  await page.getByRole("link", { name: "My desk", exact: true }).click();
  await page
    .getByRole("button", {
      name: `${inks[0].brand} ${inks[0].name}`,
      exact: true,
    })
    .click();
  await page.screenshot({
    path: "docs/verification/desk-iteration/connected-desktop.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 780, height: 1000 });
  await page.screenshot({
    path: "docs/verification/desk-iteration/connected-half-width.png",
    fullPage: false,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  // Selection uses a stable slot at both target widths, including long names.
  for (const width of [1440, 780]) {
    await page.setViewportSize({ width, height: 1000 });
    const swatches = page.locator(".desk-swatch");
    await swatches.nth(3).click();
    const measure = () =>
      page
        .locator(".selection-slot")
        .evaluate((el) => ({
          top: el.getBoundingClientRect().top + scrollY,
          height: el.clientHeight,
          width: el.clientWidth,
        }));
    const before = await measure();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `docs/verification/desk-iteration/short-name-${width}.png` });
    await swatches.nth(4).click();
    assert.deepEqual(await measure(), before);
    await page
      .getByRole("button", { name: "Deselect ink", exact: true })
      .click();
    await page.waitForTimeout(220);
    assert.equal(
      await page.locator(".desk-swatch[aria-pressed=true]").count(),
      0,
    );
    await page.getByText("No ink selected", { exact: true }).waitFor();
    assert.deepEqual(await measure(), before);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `docs/verification/desk-iteration/deselected-${width}.png`,
      fullPage: false,
    });
    await swatches.nth(4).click();
    await page.waitForTimeout(220);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `docs/verification/desk-iteration/selected-${width}.png`,
      fullPage: false,
    });
    await page
      .getByRole("button", { name: "Edit palette", exact: true })
      .click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `docs/verification/desk-iteration/editing-${width}.png`,
      fullPage: false,
    });
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".selected-panel")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const name of ["Pens", "Inks", "Refill queue", "Activity"]) {
    await page.getByRole("link", { name, exact: true }).click();
    await page
      .getByRole("heading", { level: 1, name: name + "_", exact: true })
      .waitFor();
    assert.equal(await page.getByRole("dialog").count(), 0);
    if (name === "Pens" || name === "Inks") {
      await page
        .getByLabel(`Search ${name.toLowerCase()}`)
        .fill(name === "Pens" ? pens[0].brand : inks[0].brand);
      await page.locator(".collection-row").first().click();
      await page.locator(".reference-detail h2").waitFor();
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `docs/verification/desk-iteration/${name.toLowerCase().replaceAll(" ", "-")}.png`,
      fullPage: false,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await page.goBack();
  assert.equal(
    await page
      .getByRole("link", { name: "Refill queue" })
      .getAttribute("aria-current"),
    "page",
  );
  await page.getByRole("link", { name: "My desk", exact: true }).click();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByLabel("Palette name").fill("New daily palette");
  await page.getByRole("button", { name: "Save palette", exact: true }).click();
  await page
    .getByRole("button", { name: "New daily palette", exact: true })
    .waitFor();
  assert.ok(state.palettes.some((p) => p.name === "New daily palette"));
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByRole("button", { name: "Owner sign in", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Edit palette", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Owner sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("viewer@example.test");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("◉ Signed in · View only", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Edit palette", exact: true }).count(), 0);
  await page.screenshot({ path: "docs/verification/desk-iteration/view-only.png" });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Owner sign in", exact: true }).waitFor();
  state.events = [];
  state.palettes = [];
  await page.reload();
  await page.getByText("No currently inked pens.", { exact: true }).waitFor();
  await page.screenshot({ path: "docs/verification/desk-iteration/empty.png" });
  assert.deepEqual(errors, []);
  console.log(
    `PASS: public/owner gates; refill-specific writing add/correct/delete; saved palette keyboard order/omit/restore/copy/delete; needs-refill chooser; mixed refill; failed-save draft retention; cleaning; half-width; ${writes.length} synthetic RPC writes, zero real writes.`,
  );
} finally {
  await browser.close();
}
