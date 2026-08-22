import { test } from "node:test";
import assert from "node:assert/strict";
import { HealthController } from "../src/health/health.controller";
import type { Db } from "../src/db/db.module";

const dbThat = (execute: () => Promise<unknown>) => ({ execute }) as unknown as Db;

test("reports ok when the database answers", async () => {
  const c = new HealthController(dbThat(async () => [{ "?column?": 1 }]));
  const r = await c.check();
  assert.equal(r.status, "ok");
  assert.equal(r.db, "up");
  assert.equal(typeof r.latencyMs, "number");
});

test("reports degraded, not ok, when the database is unreachable", async () => {
  // The whole point: a health check that only proves the process is alive
  // reports green to Render while every real request fails.
  const c = new HealthController(
    dbThat(async () => {
      throw new Error("ECONNREFUSED 127.0.0.1:5432");
    })
  );
  const r = await c.check();
  assert.equal(r.status, "degraded");
  assert.equal(r.db, "down");
  assert.match(String(r.error), /ECONNREFUSED/);
});

test("never throws — a thrown health check is an opaque 500", async () => {
  const c = new HealthController(dbThat(async () => { throw "not an Error"; }));
  await assert.doesNotReject(() => c.check());
});
