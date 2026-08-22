import {
  pgTable, text, timestamp, integer, doublePrecision, boolean,
  uniqueIndex, index, primaryKey,
} from "drizzle-orm/pg-core";

/**
 * IDs are strings generated client-side by WatermelonDB. Postgres must accept
 * them as primary keys and never generate its own for a synced table, or the
 * same row ends up with two identities on two devices.
 *
 * Column names here must match packages/shared/src/sync-schema.ts.
 * test/schema-parity.test.ts enforces that.
 */
const id = () => text("id").primaryKey();

const stamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /** Tombstone. Pull emits these as `deleted` ids; rows are never hard-deleted. */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    // Server-only. Never leaves the API, never syncs to a device.
    passwordHash: text("password_hash"),
    appleSub: text("apple_sub"),
    googleSub: text("google_sub"),
    ...stamps,
  },
  (t) => [
    uniqueIndex("users_email_key").on(t.email),
    uniqueIndex("users_apple_sub_key").on(t.appleSub),
    uniqueIndex("users_google_sub_key").on(t.googleSub),
  ]
);

export const spaces = pgTable("spaces", {
  id: id(),
  name: text("name").notNull(),
  baseCurrency: text("base_currency").notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  ...stamps,
});

/**
 * The privacy boundary. Every pull is scoped through this table — never
 * through a client-side filter.
 */
export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id),
    spaceId: text("space_id").notNull().references(() => spaces.id),
    role: text("role", { enum: ["owner", "member", "viewer"] }).notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set on removal so the next pull can tombstone that space's rows. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...stamps,
  },
  (t) => [
    uniqueIndex("memberships_user_space_key").on(t.userId, t.spaceId),
    index("memberships_space_idx").on(t.spaceId),
  ]
);

export const invites = pgTable(
  "invites",
  {
    id: id(),
    spaceId: text("space_id").notNull().references(() => spaces.id),
    code: text("code").notNull(),
    createdBy: text("created_by").notNull().references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedBy: text("accepted_by").references(() => users.id),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invites_code_key").on(t.code)]
);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    spaceId: text("space_id").notNull().references(() => spaces.id),
    name: text("name").notNull(),
    colorKey: text("color_key").notNull(),
    symbol: text("symbol").notNull(),
    kind: text("kind", { enum: ["expense", "income"] }).notNull(),
    sort: integer("sort").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    ...stamps,
  },
  (t) => [index("categories_space_idx").on(t.spaceId)]
);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    spaceId: text("space_id").notNull().references(() => spaces.id),
    categoryId: text("category_id").notNull().references(() => categories.id),
    createdBy: text("created_by").notNull().references(() => users.id),
    kind: text("kind", { enum: ["expense", "income"] }).notNull(),
    /** Integer minor units. Never a float, at any layer. */
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    /** Frozen at entry so history never re-prices when the naira moves. */
    rateToBase: doublePrecision("rate_to_base").notNull(),
    baseMinor: integer("base_minor").notNull(),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    recurringRuleId: text("recurring_rule_id"),
    ...stamps,
  },
  (t) => [
    index("transactions_space_occurred_idx").on(t.spaceId, t.occurredAt),
    index("transactions_category_idx").on(t.categoryId),
  ]
);

export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: id(),
    spaceId: text("space_id").notNull().references(() => spaces.id),
    categoryId: text("category_id").notNull().references(() => categories.id),
    kind: text("kind", { enum: ["expense", "income"] }).notNull(),
    label: text("label").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    freq: text("freq", { enum: ["monthly", "weekly", "biweekly", "yearly"] }).notNull(),
    dayOfMonth: integer("day_of_month"),
    weekday: integer("weekday"),
    interval: integer("interval").notNull().default(1),
    startOn: timestamp("start_on", { withTimezone: true }).notNull(),
    endOn: timestamp("end_on", { withTimezone: true }),
    /** false means it asks you to confirm — the salary case. */
    autoPost: boolean("auto_post").notNull().default(false),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    ...stamps,
  },
  (t) => [index("recurring_next_run_idx").on(t.nextRunAt, t.active)]
);

export const budgets = pgTable(
  "budgets",
  {
    id: id(),
    spaceId: text("space_id").notNull().references(() => spaces.id),
    categoryId: text("category_id").notNull().references(() => categories.id),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    ...stamps,
  },
  (t) => [uniqueIndex("budgets_space_cat_period_key").on(t.spaceId, t.categoryId, t.periodStart)]
);

export const fxRates = pgTable(
  "fx_rates",
  {
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    /** Text so no float ever touches a stored rate. */
    rate: text("rate").notNull(),
    source: text("source", { enum: ["auto", "manual"] }).notNull(),
    /** Null for auto rates; set for a user's own override. */
    ownerUserId: text("owner_user_id").references(() => users.id),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.base, t.quote, t.source] })]
);

/** Refresh tokens are bound to a device, which sync needs anyway. */
export const devices = pgTable(
  "devices",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    platform: text("platform").notNull(),
    lastPulledAt: timestamp("last_pulled_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("devices_user_idx").on(t.userId)]
);

/** Tables the sync protocol moves, in FK-safe insert order. */
export const SYNCED = {
  users, spaces, memberships, categories, transactions, recurringRules, budgets,
} as const;
