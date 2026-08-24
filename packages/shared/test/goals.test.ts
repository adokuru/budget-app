import { test } from "node:test";
import assert from "node:assert/strict";
import { goalPercent, goalState, goalTotal } from "../src/goals.ts";

test("goal totals and progress cover empty, partial, complete and overfunded goals", () => {
  assert.equal(goalTotal([]), 0);
  assert.equal(goalTotal([20_000, 30_000]), 50_000);
  assert.equal(goalPercent(0, 100_000), 0);
  assert.equal(goalPercent(50_000, 100_000), 50);
  assert.equal(goalState(100_000, 100_000, null), "completed");
  assert.equal(goalPercent(125_000, 100_000), 125);
  assert.equal(goalState(125_000, 100_000, null), "completed");
});

test("only incomplete goals past their due day are overdue", () => {
  const now = new Date("2026-08-24T12:00:00Z").getTime();
  assert.equal(goalState(50, 100, new Date("2026-08-23T00:00:00Z").getTime(), now), "overdue");
  assert.equal(goalState(50, 100, new Date("2026-08-25T00:00:00Z").getTime(), now), "active");
  assert.equal(goalState(100, 100, new Date("2026-08-23T00:00:00Z").getTime(), now), "completed");
});
