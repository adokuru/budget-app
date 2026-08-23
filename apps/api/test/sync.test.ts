import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { ConfigService } from "@nestjs/config";
import * as schema from "../src/db/schema";
import type { Db } from "../src/db/db.module";
import { SyncService } from "../src/sync/sync.service";
import { SpacesService } from "../src/spaces/spaces.service";
import { AuthService } from "../src/auth/auth.service";

/**
 * Integration tests against a real Postgres. Sync is the feature where a bug
 * either loses someone's money or shows them someone else's, so it is tested
 * against the real database rather than a mock that would agree with itself.
 */
const URL = process.env.TEST_DATABASE_URL
  ?? "postgres://postgres@127.0.0.1:5432/kobo_test";

let pool: Pool;
let db: Db;
let sync: SyncService;
let spaces: SpacesService;
let auth: AuthService;

const config = {
  get: (k: string) =>
    k === "JWT_SECRET" ? "test-secret-that-is-at-least-32-chars-long" : undefined,
} as unknown as ConfigService;

before(async () => {
  pool = new Pool({ connectionString: URL });
  db = drizzle(pool, { schema });
  sync = new SyncService(db);
  spaces = new SpacesService(db);
  auth = new AuthService(db, config);
});

after(async () => {
  await pool.end();
});

beforeEach(async () => {
  await db.execute(sql`
    truncate transactions, budgets, recurring_rules, categories,
             invites, memberships, spaces, devices, users cascade
  `);
});

let seq = 0;
const device = () => `device-${randomUUID()}`;

async function newUser(name: string) {
  seq += 1;
  const session = await auth.register({
    email: `user${seq}-${randomUUID()}@example.com`,
    password: "a good long passphrase",
    name,
    deviceId: device(),
    platform: "ios",
  });
  return session.user.id;
}

const countDeleted = (changes: Record<string, { deleted: string[] }>) =>
  Object.fromEntries(
    Object.entries(changes).map(([k, v]) => [k, v.deleted.length]).filter(([, n]) => (n as number) > 0)
  );

test("a new account is seeded with a private Personal space", async () => {
  const userId = await newUser("Solo");
  const { changes } = await sync.pull(userId, 0);

  assert.deepEqual(changes.spaces!.created.map((s) => s.name), ["Personal"]);
  assert.equal(changes.categories!.created.length, 12, "Nigerian defaults seeded");
});

test("a pull never contains another user's space", async () => {
  const a = await newUser("A");
  const b = await newUser("B");
  await spaces.create(a, "Family", "NGN");

  const pullB = await sync.pull(b, 0);
  assert.deepEqual(pullB.changes.spaces!.created.map((s) => s.name), ["Personal"]);
});

test("a pull never contains password hashes or provider subjects", async () => {
  const a = await newUser("A");
  const { changes } = await sync.pull(a, 0);
  const json = JSON.stringify(changes);

  for (const secret of ["password_hash", "apple_sub", "google_sub"]) {
    assert.ok(!json.includes(secret), `${secret} leaked into a sync payload`);
  }
});

test("push from one member converges on the other", async () => {
  const a = await newUser("A");
  const b = await newUser("B");
  const family = await spaces.create(a, "Family", "NGN");
  const { code } = await spaces.createInvite(a, family.id);
  await spaces.join(b, code);

  const catId = (await sync.pull(a, 0)).changes.categories!.created
    .find((c) => c.space_id === family.id)!.id as string;

  const txnId = randomUUID();
  await sync.push(a, {
    transactions: {
      created: [{
        id: txnId, space_id: family.id, category_id: catId, created_by: a,
        kind: "expense", amount_minor: 20_000_000, currency: "NGN",
        rate_to_base: 1, base_minor: 20_000_000, note: "Market run",
        occurred_at: new Date("2026-08-22T10:00:00Z"),
      }],
      updated: [], deleted: [],
    },
  }, 0);

  const pullB = await sync.pull(b, 0);
  const txn = pullB.changes.transactions!.created.find((t) => t.id === txnId);
  assert.ok(txn, "B did not converge on A's transaction");
  assert.equal(txn!.amount_minor, 20_000_000);
  assert.equal(txn!.note, "Market run");
});

test("the server, not the client, decides who authored a row", async () => {
  const a = await newUser("A");
  const family = await spaces.create(a, "Family", "NGN");
  const catId = (await sync.pull(a, 0)).changes.categories!.created
    .find((c) => c.space_id === family.id)!.id as string;

  const txnId = randomUUID();
  await sync.push(a, {
    transactions: {
      created: [{
        id: txnId, space_id: family.id, category_id: catId,
        created_by: "somebody-else-entirely",
        kind: "expense", amount_minor: 100, currency: "NGN",
        rate_to_base: 1, base_minor: 100,
        occurred_at: new Date("2026-08-22T10:00:00Z"),
      }],
      updated: [], deleted: [],
    },
  }, 0);

  const txn = (await sync.pull(a, 0)).changes.transactions!.created[0]!;
  assert.equal(txn.created_by, a, "a client must not be able to forge authorship");
});

test("pushing into a space you do not belong to is refused", async () => {
  const a = await newUser("A");
  const b = await newUser("B");
  const family = await spaces.create(a, "Family", "NGN");

  await assert.rejects(
    () =>
      sync.push(b, {
        transactions: {
          created: [{
            id: randomUUID(), space_id: family.id, category_id: "x",
            kind: "expense", amount_minor: 1, currency: "NGN",
            rate_to_base: 1, base_minor: 1,
            occurred_at: new Date("2026-08-22T10:00:00Z"),
          }],
          updated: [], deleted: [],
        },
      }, 0),
    /Not a member/
  );
});

test("a stale push is rejected instead of overwriting a change it never saw", async () => {
  const a = await newUser("A");
  const family = await spaces.create(a, "Family", "NGN");
  const catId = (await sync.pull(a, 0)).changes.categories!.created
    .find((c) => c.space_id === family.id)!.id as string;

  const txnId = randomUUID();
  const row = {
    id: txnId, space_id: family.id, category_id: catId,
    kind: "expense", currency: "NGN", rate_to_base: 1,
    occurred_at: new Date("2026-08-22T10:00:00Z"),
  };

  await sync.push(a, {
    transactions: {
      created: [{ ...row, amount_minor: 1000, base_minor: 1000 }],
      updated: [], deleted: [],
    },
  }, 0);

  // lastPulledAt of 1 is far behind the row's updated_at.
  await assert.rejects(
    () =>
      sync.push(a, {
        transactions: {
          created: [], deleted: [],
          updated: [{ ...row, amount_minor: 9999, base_minor: 9999 }],
        },
      }, 1),
    /changed this while you were offline/
  );
});

test("removing a member tombstones that space on their next pull", async () => {
  const a = await newUser("A");
  const b = await newUser("B");
  const family = await spaces.create(a, "Family", "NGN");
  const { code } = await spaces.createInvite(a, family.id);
  await spaces.join(b, code);

  const catId = (await sync.pull(a, 0)).changes.categories!.created
    .find((c) => c.space_id === family.id)!.id as string;
  await sync.push(a, {
    transactions: {
      created: [{
        id: randomUUID(), space_id: family.id, category_id: catId, created_by: a,
        kind: "expense", amount_minor: 5000, currency: "NGN",
        rate_to_base: 1, base_minor: 5000,
        occurred_at: new Date("2026-08-22T10:00:00Z"),
      }],
      updated: [], deleted: [],
    },
  }, 0);

  // B has the family data before removal.
  const before = await sync.pull(b, 0);
  assert.ok(before.changes.spaces!.created.some((s) => s.id === family.id));

  await spaces.removeMember(a, family.id, b);

  // The only way the protocol can say "forget this" is a deletion.
  const after = await sync.pull(b, 1);
  const deleted = countDeleted(after.changes as never);

  assert.ok((deleted.spaces ?? 0) >= 1, "the space itself must be tombstoned");
  assert.ok((deleted.categories ?? 0) >= 12, "its categories must be tombstoned");
  assert.ok((deleted.transactions ?? 0) >= 1, "its transactions must be tombstoned");
  assert.ok(
    !after.changes.spaces!.created.some((s) => s.id === family.id),
    "a removed member must not still receive the space"
  );
});

test("a removed member can no longer push into the space", async () => {
  const a = await newUser("A");
  const b = await newUser("B");
  const family = await spaces.create(a, "Family", "NGN");
  const { code } = await spaces.createInvite(a, family.id);
  await spaces.join(b, code);
  await spaces.removeMember(a, family.id, b);

  await assert.rejects(
    () =>
      sync.push(b, {
        transactions: {
          created: [{
            id: randomUUID(), space_id: family.id, category_id: "x",
            kind: "expense", amount_minor: 1, currency: "NGN",
            rate_to_base: 1, base_minor: 1,
            occurred_at: new Date("2026-08-22T10:00:00Z"),
          }],
          updated: [], deleted: [],
        },
      }, 0),
    /Not a member/
  );
});

test("the pull timestamp can be replayed without missing changes", async () => {
  const a = await newUser("A");
  const first = await sync.pull(a, 0);

  const family = await spaces.create(a, "Family", "NGN");
  const second = await sync.pull(a, first.timestamp);

  assert.ok(
    second.changes.spaces!.created.concat(second.changes.spaces!.updated)
      .some((s) => s.id === family.id),
    "a space created after the first pull must appear in the next one"
  );
});

test("an expired invite is refused", async () => {
  const a = await newUser("A");
  const b = await newUser("B");
  const family = await spaces.create(a, "Family", "NGN");
  const { code } = await spaces.createInvite(a, family.id);

  await db.execute(sql`update invites set expires_at = now() - interval '1 day' where code = ${code}`);
  await assert.rejects(() => spaces.join(b, code), /invalid or has expired/);
});

test("a non-owner cannot remove members", async () => {
  const a = await newUser("A");
  const b = await newUser("B");
  const family = await spaces.create(a, "Family", "NGN");
  const { code } = await spaces.createInvite(a, family.id);
  await spaces.join(b, code);

  await assert.rejects(() => spaces.removeMember(b, family.id, a), /do not have permission/);
});

test("date columns reach the client as epoch millis, not strings", async () => {
  const a = await newUser("A");
  const family = await spaces.create(a, "Family", "NGN");
  const catId = (await sync.pull(a, 0)).changes.categories!.created
    .find((c) => c.space_id === family.id)!.id as string;

  const occurred = new Date("2026-08-18T09:00:00Z");
  await sync.push(a, {
    transactions: {
      created: [{
        id: randomUUID(), space_id: family.id, category_id: catId, created_by: a,
        kind: "expense", amount_minor: 18_400_000, currency: "NGN",
        rate_to_base: 1, base_minor: 18_400_000, note: "Market",
        occurred_at: occurred,
      }],
      updated: [], deleted: [],
    },
  }, 0);

  const txn = (await sync.pull(a, 0)).changes.transactions!.created[0]!;

  // WatermelonDB stores dates as numbers. A string here lands in SQLite and
  // every date comparison silently matches nothing.
  assert.equal(typeof txn.occurred_at, "number", `got ${typeof txn.occurred_at}`);
  assert.equal(txn.occurred_at, occurred.getTime());
  assert.equal(typeof txn.created_at, "number");
  assert.equal(typeof txn.amount_minor, "number");
  assert.equal(typeof txn.currency, "string");
});

test("boolean columns survive Postgres round-tripping", async () => {
  const a = await newUser("A");
  const family = await spaces.create(a, "Family", "NGN");
  const cat = (await sync.pull(a, 0)).changes.categories!.created
    .find((c) => c.space_id === family.id)!;

  assert.equal(typeof cat.archived, "boolean", `got ${typeof cat.archived}`);
  assert.equal(cat.archived, false);
  assert.equal(typeof cat.sort, "number");
});

test("a push carrying epoch-millis dates is accepted", async () => {
  const a = await newUser("A");
  const family = await spaces.create(a, "Family", "NGN");
  const catId = (await sync.pull(a, 0)).changes.categories!.created
    .find((c) => c.space_id === family.id)!.id as string;

  const occurredMs = Date.parse("2026-08-18T09:00:00Z");

  // This is exactly what WatermelonDB sends: numbers, not Date objects.
  // Postgres cannot parse a bare number as timestamptz, so before the push
  // side coerced them, every save on device failed to sync.
  await sync.push(a, {
    transactions: {
      created: [{
        id: randomUUID(), space_id: family.id, category_id: catId, created_by: a,
        kind: "expense", amount_minor: 1500, currency: "NGN",
        rate_to_base: 1, base_minor: 1500, note: "Snack",
        occurred_at: occurredMs,
        created_at: occurredMs,
        updated_at: occurredMs,
      }],
      updated: [], deleted: [],
    },
  }, 0);

  const txn = (await sync.pull(a, 0)).changes.transactions!.created
    .find((t) => t.amount_minor === 1500);

  assert.ok(txn, "a push with millis dates never landed");
  assert.equal(txn!.occurred_at, occurredMs, "the date round-tripped incorrectly");
});

test("a recurring rule round-trips its millis dates", async () => {
  const a = await newUser("A");
  const family = await spaces.create(a, "Family", "NGN");
  const catId = (await sync.pull(a, 0)).changes.categories!.created
    .find((c) => c.space_id === family.id)!.id as string;

  const startOn = Date.parse("2026-08-01T00:00:00Z");
  const nextRunAt = Date.parse("2026-08-25T00:00:00Z");

  await sync.push(a, {
    recurring_rules: {
      created: [{
        id: randomUUID(), space_id: family.id, category_id: catId,
        kind: "income", label: "Salary", amount_minor: 45_000_000, currency: "NGN",
        freq: "monthly", day_of_month: 25, weekday: null, interval: 1,
        start_on: startOn, end_on: null, auto_post: false,
        next_run_at: nextRunAt, last_run_at: null, active: true,
      }],
      updated: [], deleted: [],
    },
  }, 0);

  const rule = (await sync.pull(a, 0)).changes.recurring_rules!.created[0]!;
  assert.equal(rule.start_on, startOn);
  assert.equal(rule.next_run_at, nextRunAt);
  assert.equal(rule.auto_post, false);
  assert.equal(rule.day_of_month, 25);
  assert.equal(rule.last_run_at, null);
});
