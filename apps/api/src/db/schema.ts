import {
  pgTable, text, timestamp, integer, uniqueIndex, index, primaryKey,
} from "drizzle-orm/pg-core";

/**
 * IDs are strings generated client-side by WatermelonDB. Postgres must
 * accept them as primary keys and must never generate its own for any
 * table that syncs, or the same row ends up with two identities.
 */
const id = () => text("id").primaryKey();

/** Epoch millis, matching WatermelonDB's number columns exactly. */
const syncTimestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  /** Tombstone. Sync emits these as `deleted` ids; rows are never hard-deleted. */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    appleSub: text("apple_sub"),
    googleSub: text("google_sub"),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    ...syncTimestamps,
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
  /** ISO 4217. The space reports in this currency. */
  baseCurrency: text("base_currency").notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  ...syncTimestamps,
});

/**
 * The privacy boundary. Every sync pull is scoped through this table —
 * never through a client-side filter.
 */
export const memberships = pgTable(
  "memberships",
  {
    userId: text("user_id").notNull().references(() => users.id),
    spaceId: text("space_id").notNull().references(() => spaces.id),
    role: text("role", { enum: ["owner", "member", "viewer"] }).notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    /** Set when a member is removed, so the next pull can emit their tombstones. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.spaceId] }),
    index("memberships_space_idx").on(t.spaceId),
  ]
);

/**
 * Rates are stored against a single pivot, and manual overrides live here
 * too as source='manual'. An override always wins over a fetched rate.
 */
export const fxRates = pgTable(
  "fx_rates",
  {
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    /** Stored as text so no float ever touches a rate. */
    rate: text("rate").notNull(),
    source: text("source", { enum: ["auto", "manual"] }).notNull(),
    /** Null for auto rates; set for a user's personal override. */
    ownerUserId: text("owner_user_id").references(() => users.id),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.base, t.quote, t.source] })]
);
