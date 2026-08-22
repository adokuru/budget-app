import { test } from "node:test";
import assert from "node:assert/strict";
import { getTableColumns } from "drizzle-orm";
import { SYNC_SCHEMA, SYNC_TABLE_NAMES, columnsOf } from "@budget/shared";
import { SYNCED } from "../src/db/schema";

/**
 * The one real cost of running WatermelonDB on the client and Drizzle on the
 * server is two schema definitions. This test is what makes that safe: a
 * column added to one and forgotten in the other fails here, not in production
 * as a field that silently never syncs.
 */

/** Server-side columns that deliberately never reach a device. */
const SERVER_ONLY: Record<string, string[]> = {
  users: ["password_hash", "apple_sub", "google_sub", "created_at", "updated_at"],
  memberships: ["revoked_at", "created_at", "updated_at"],
};

/** Present on every server table, never listed in the shared manifest. */
const UNIVERSAL = ["id", "deleted_at"];

const byTable = {
  users: SYNCED.users,
  spaces: SYNCED.spaces,
  memberships: SYNCED.memberships,
  categories: SYNCED.categories,
  transactions: SYNCED.transactions,
  recurring_rules: SYNCED.recurringRules,
  budgets: SYNCED.budgets,
} as const;

const pgColumnNames = (t: (typeof byTable)[keyof typeof byTable]) =>
  Object.values(getTableColumns(t)).map((c) => c.name);

test("every synced table in the manifest exists in Postgres", () => {
  for (const name of SYNC_TABLE_NAMES) {
    assert.ok(name in byTable, `manifest table "${name}" has no Drizzle table`);
  }
});

test("every manifest column exists in Postgres", () => {
  for (const name of SYNC_TABLE_NAMES) {
    const pg = new Set(pgColumnNames(byTable[name]));
    for (const col of columnsOf(name)) {
      assert.ok(pg.has(col), `${name}.${col} is in the manifest but not in Postgres`);
    }
  }
});

test("Postgres has no unexplained extra columns", () => {
  for (const name of SYNC_TABLE_NAMES) {
    const allowed = new Set([
      ...columnsOf(name),
      ...UNIVERSAL,
      ...(SERVER_ONLY[name] ?? []),
    ]);
    for (const col of pgColumnNames(byTable[name])) {
      assert.ok(
        allowed.has(col),
        `${name}.${col} exists in Postgres but is not in the manifest. ` +
          `Add it to the manifest so it syncs, or to SERVER_ONLY if it must not.`
      );
    }
  }
});

test("money columns are always integer minor units", () => {
  for (const name of SYNC_TABLE_NAMES) {
    for (const col of columnsOf(name)) {
      if (!col.endsWith("_minor")) continue;
      assert.equal(
        SYNC_SCHEMA[name][col as never]?.["type"],
        "number",
        `${name}.${col} must be a number — money is never stored as text`
      );
      const pgCol = Object.values(getTableColumns(byTable[name])).find((c) => c.name === col);
      assert.equal(
        pgCol?.columnType,
        "PgInteger",
        `${name}.${col} must be integer in Postgres, not numeric or real`
      );
    }
  }
});

test("secrets never appear in the client manifest", () => {
  const leaked = SYNC_TABLE_NAMES.flatMap((n) =>
    columnsOf(n).filter((c) => /password|secret|token|_sub$/.test(c)).map((c) => `${n}.${c}`)
  );
  assert.deepEqual(leaked, [], "these would sync to every device");
});
