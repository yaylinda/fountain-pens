import test from "node:test";
import assert from "node:assert/strict";
import {
  initialRefills,
  initialPalettes,
  recordDay,
  fillPen,
  moveInk,
} from "../src/desk-lab/model";

test("demo writing is unique per refill/date and leaves the other pen unchanged", () => {
  const once = recordDay(initialRefills, "r2", "2026-10-18");
  const twice = recordDay(once, "r2", "2026-10-18");
  assert.deepEqual(once, twice);
  assert.deepEqual(
    twice.find((r) => r.id === "r1"),
    initialRefills[0],
  );
  assert.equal(twice.find((r) => r.id === "r2")?.days.at(-1), "2026-10-18");
});
test("demo refill preserves mixed ink history and starts its own writing days", () => {
  const next = fillPen(initialRefills, "r3", 4, "2026-10-19", "new-refill");
  assert.deepEqual(
    next.find((r) => r.id === "r3"),
    { ...initialRefills[2], closed: true },
  );
  assert.deepEqual(next.find((r) => r.id === "new-refill")?.days, []);
  assert.deepEqual(next.find((r) => r.id === "r3")?.inks, [9, 10]);
  assert.equal(next.filter((r) => !r.closed).length, initialRefills.length);
});
test("palette rearrangement preserves membership and does not mutate other arrangements", () => {
  const before = structuredClone(initialPalettes);
  const next = moveInk(initialPalettes[1].ids, 4, 7);
  assert.deepEqual(next, [5, 6, 7, 4, 8, 15, 17, 0]);
  assert.deepEqual(initialPalettes, before);
});
