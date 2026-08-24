/**
 * The one definition of every synced table's columns.
 *
 * WatermelonDB's schema is generated from this at runtime. Drizzle's Postgres
 * schema is written by hand (it needs real types, FKs and indexes), and a
 * parity test asserts the column names match. That test is the only thing
 * standing between us and a sync that silently drops a column.
 *
 * Conventions:
 *  - snake_case everywhere, because WatermelonDB requires it
 *  - money is always `*_minor`, an integer count of minor units
 *  - `id`, `_status` and `_changed` are added by WatermelonDB; never list them
 */
export type ColumnType = "string" | "number" | "boolean";

export type Column = {
  type: ColumnType;
  optional?: true;
  indexed?: true;
};

export type TableDef = Record<string, Column>;

const str = (o?: Omit<Column, "type">): Column => ({ type: "string", ...o });
const num = (o?: Omit<Column, "type">): Column => ({ type: "number", ...o });
const bool = (o?: Omit<Column, "type">): Column => ({ type: "boolean", ...o });

export const SYNC_SCHEMA = {
  /** Read-only local cache, so member avatars render offline. */
  users: {
    name: str(),
    email: str(),
    avatar_url: str({ optional: true }),
  },

  spaces: {
    name: str(),
    base_currency: str(),
    created_by: str({ indexed: true }),
    created_at: num(),
    updated_at: num(),
  },

  memberships: {
    user_id: str({ indexed: true }),
    space_id: str({ indexed: true }),
    role: str(),
    joined_at: num(),
  },

  categories: {
    space_id: str({ indexed: true }),
    name: str(),
    color_key: str(),
    symbol: str(),
    emoji: str(),
    kind: str(),
    sort: num(),
    archived: bool(),
    created_at: num(),
    updated_at: num(),
  },

  transactions: {
    space_id: str({ indexed: true }),
    category_id: str({ indexed: true }),
    created_by: str({ indexed: true }),
    kind: str(),
    amount_minor: num(),
    currency: str(),
    /** Rate to the space's base currency, frozen at entry time. */
    rate_to_base: num(),
    /** amount_minor already converted at rate_to_base. Reports read this. */
    base_minor: num(),
    note: str({ optional: true }),
    occurred_at: num({ indexed: true }),
    recurring_rule_id: str({ optional: true, indexed: true }),
    created_at: num(),
    updated_at: num(),
  },

  recurring_rules: {
    space_id: str({ indexed: true }),
    category_id: str({ indexed: true }),
    kind: str(),
    label: str(),
    amount_minor: num(),
    currency: str(),
    freq: str(),
    day_of_month: num({ optional: true }),
    weekday: num({ optional: true }),
    interval: num(),
    start_on: num(),
    end_on: num({ optional: true }),
    /** false means it asks you to confirm — the salary case. */
    auto_post: bool(),
    next_run_at: num({ indexed: true }),
    last_run_at: num({ optional: true }),
    active: bool(),
    created_at: num(),
    updated_at: num(),
  },

  budgets: {
    space_id: str({ indexed: true }),
    category_id: str({ indexed: true }),
    /** First day of the period, epoch ms, UTC midnight. */
    period_start: num({ indexed: true }),
    amount_minor: num(),
    currency: str(),
    created_at: num(),
    updated_at: num(),
  },

  goals: {
    space_id: str({ indexed: true }),
    created_by: str({ indexed: true }),
    name: str(),
    target_minor: num(),
    currency: str(),
    due_at: num({ optional: true, indexed: true }),
    created_at: num(),
    updated_at: num(),
  },

  goal_contributions: {
    space_id: str({ indexed: true }),
    goal_id: str({ indexed: true }),
    created_by: str({ indexed: true }),
    amount_minor: num(),
    currency: str(),
    contributed_at: num({ indexed: true }),
    created_at: num(),
    updated_at: num(),
  },
} as const satisfies Record<string, TableDef>;

export type SyncTableName = keyof typeof SYNC_SCHEMA;

export const SYNC_TABLE_NAMES = Object.keys(SYNC_SCHEMA) as SyncTableName[];

/** Tables understood by the store build that shipped with schema version 1. */
export const SYNC_V1_TABLE_NAMES = SYNC_TABLE_NAMES.filter(
  (name) => name !== "goals" && name !== "goal_contributions"
);

export const SYNC_SCHEMA_VERSION = 2;

export function syncTablesForVersion(version: number): SyncTableName[] {
  return version >= SYNC_SCHEMA_VERSION ? SYNC_TABLE_NAMES : SYNC_V1_TABLE_NAMES;
}

/** Column names for one table, for the parity test and for sync payloads. */
export function columnsOf(table: SyncTableName): string[] {
  return Object.keys(SYNC_SCHEMA[table]);
}
