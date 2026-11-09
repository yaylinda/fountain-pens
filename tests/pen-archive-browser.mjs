// Run against a local Vite server with synthetic public config and Playwright.
// Backend calls are intercepted; no production data is read or changed.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const state = {
  pens: [{ id: "pen", brand: "Pilot", model: "Custom 74", color: "Blue", nibSize: "Fine", nibType: "Gold",
    archived: false, favorite: true, needsRefill: true, details: "Keep these notes", sources: [] }],
  inks: [{ id: "ink", brand: "Pilot", name: "Blue", collection: "", colorHex: "#32589c", archived: false, favorite: false }],
  events: [{ id: "fill", sequence: "1", penId: "pen", kind: "refill", date: "2026-10-01", inkIds: ["ink"], notes: "Keep this history", notPure: false }],
  asOf: "2026-11-07", canEdit: false, writingLogs: [], palettes: [],
};
const original = structuredClone(state);
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/*", async (route) => {
  const request = route.request(), url = new URL(request.url());
  if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
  const name = url.pathname.split("/").at(-1), body = request.postDataJSON() || {};
  let result;
  if (name === "token") {
    state.canEdit = true;
    const id = "00000000-0000-4000-8000-000000000001";
    const token = `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.synthetic`;
    result = { access_token: token, refresh_token: "synthetic", expires_in: 3600, token_type: "bearer",
      user: { id, email: "owner@example.test", aud: "authenticated", app_metadata: {}, user_metadata: {} } };
  } else if (name === "get_collection") result = state;
  else if (name === "update_pen") {
    assert.equal(state.canEdit, true);
    assert.equal(body.p_id, "pen");
    assert.deepEqual(body.p_item, {brand:"Pilot", model:"Custom 74", color:"Blue", nibSize:"Fine", nibType:"Gold", archived:body.p_item.archived, favorite:true, needsRefill:true});
    Object.assign(state.pens[0], body.p_item);
    result = { item: state.pens[0] };
  } else throw Error(`Unexpected backend request: ${url.pathname}`);
  await route.fulfill({ json: result });
});
try {
  await mkdir(".artifacts/pen-archive", { recursive: true });
  await page.goto(process.env.DESK_URL || "http://127.0.0.1:5196/");
  await page.getByRole("link", { name: "Pens", exact: true }).click();
  await page.locator(".collection-row").click();
  assert.equal(await page.getByRole("button", { name: "Archive pen", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Owner sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.locator(".collection-row").click();
    const archive = page.getByRole("button", { name: "Archive pen", exact: true });
    await archive.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.artifacts/pen-archive/archive-${width}.png` });
    await archive.click();
    const restore = page.getByRole("button", { name: "Restore pen", exact: true });
    await restore.waitFor();
    assert.equal(await page.locator(".collection-row").count(), 0);
    await page.getByRole("checkbox", { name: "Include archived" }).check();
    assert.equal(await page.locator(".collection-row").count(), 1);
    // Changing the archive filter clears the selected pen.
    assert.equal(await restore.count(), 0);
    await page.locator(".collection-row").click();
    await restore.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.artifacts/pen-archive/restore-${width}.png` });
    await restore.click();
    await archive.waitFor();
    await page.getByRole("checkbox", { name: "Include archived" }).uncheck();
    assert.equal(await page.locator(".collection-row").count(), 1);
    assert.deepEqual(state.pens, original.pens);
    assert.deepEqual(state.events, original.events);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  assert.deepEqual(errors, []);
  console.log("PASS archive/restore on desktop and mobile, owner-only controls, filtering and preserved data");
} finally {
  await browser.close();
}
