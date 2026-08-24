import { ConflictException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { and, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import {
  SYNC_SCHEMA, SYNC_TABLE_NAMES, isCurrency, syncTablesForVersion, type SyncTableName,
} from "@budget/shared";
import { DB, type Db } from "../db/db.module";
import {
  users, spaces, memberships, categories, transactions, recurringRules, budgets,
  goals, goalContributions,
} from "../db/schema";

type Row = Record<string, unknown>;
export type TableChanges = { created: Row[]; updated: Row[]; deleted: string[] };
export type Changes = Partial<Record<SyncTableName, TableChanges>>;
export type PullResult = { changes: Changes; timestamp: number };

const TABLES = {
  users, spaces, memberships, categories, transactions, recurring_rules: recurringRules, budgets,
  goals, goal_contributions: goalContributions,
} as const;

/**
 * Timestamp columns per table, derived from the Drizzle schema rather than a
 * hand-kept list, so adding a date column cannot silently break a push.
 */
const DATE_COLUMNS: Partial<Record<SyncTableName, Set<string>>> = {};
for (const [name, table] of Object.entries(TABLES)) {
  const columns = Object.values(
    getTableColumns(table as never)
  ) as { name: string; columnType: string }[];
  DATE_COLUMNS[name as SyncTableName] = new Set(
    columns.filter((c) => c.columnType === "PgTimestamp").map((c) => c.name)
  );
}

/** Tables whose rows record who created them. */
const HAS_AUTHOR = new Set<SyncTableName>([
  "transactions", "spaces", "goals", "goal_contributions",
]);

/** Columns that must never leave the server, even on the users table. */
const NEVER_SEND = new Set(["password_hash", "apple_sub", "google_sub", "deleted_at"]);

@Injectable()
export class SyncService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * WatermelonDB's pull contract. Everything is scoped through memberships —
   * the privacy boundary is this query, never a filter on the client.
   */
  async pull(
    userId: string,
    lastPulledAt: number,
    schemaVersion = 1,
    migrationTables: SyncTableName[] = []
  ): Promise<PullResult> {
    // One timestamp for the whole pull, taken before reading, so nothing
    // written mid-pull can fall into the gap and be missed forever.
    const timestamp = Date.now();
    const since = new Date(lastPulledAt || 0);
    const isFirstPull = !lastPulledAt;

    const myMemberships = await this.db
      .select({ spaceId: memberships.spaceId, revokedAt: memberships.revokedAt })
      .from(memberships)
      .where(eq(memberships.userId, userId));

    const activeSpaceIds = myMemberships.filter((m) => !m.revokedAt).map((m) => m.spaceId);
    const revokedSpaceIds = myMemberships.filter((m) => m.revokedAt).map((m) => m.spaceId);

    const changes: Changes = {};
    const requestedTables = syncTablesForVersion(schemaVersion);
    const migrating = new Set(migrationTables.filter((table) => requestedTables.includes(table)));

    for (const table of requestedTables) {
      changes[table] = await this.changesFor(
        table, userId, activeSpaceIds, since, isFirstPull || migrating.has(table)
      );
    }

    // Being removed from a space must tombstone that space's rows. The
    // protocol has no other way to say "these are no longer yours", and
    // without it the device keeps a permanent copy of the family's finances.
    if (revokedSpaceIds.length > 0) {
      await this.appendRevocations(changes, revokedSpaceIds, requestedTables);
    }

    return { changes, timestamp };
  }

  private async changesFor(
    table: SyncTableName,
    userId: string,
    spaceIds: string[],
    since: Date,
    isFirstPull: boolean
  ): Promise<TableChanges> {
    const empty: TableChanges = { created: [], updated: [], deleted: [] };
    if (spaceIds.length === 0 && table !== "users") return empty;

    const scope = this.scopeFor(table, userId, spaceIds);
    if (!scope) return empty;

    // drizzle's execute() returns a pg QueryResult, not an array.
    const rows = (await this.db.execute(scope.query(isFirstPull ? new Date(0) : since))).rows as Row[];

    const out: TableChanges = { created: [], updated: [], deleted: [] };
    for (const raw of rows) {
      const row = raw as Row & { id: string; deleted_at: Date | null; created_at: Date };
      if (row.deleted_at) {
        // A row created and deleted between two pulls was never seen by this
        // client, so sending its id as a deletion would be meaningless.
        if (!isFirstPull) out.deleted.push(row.id);
        continue;
      }
      const clean = sanitize(table, row);
      if (isFirstPull || new Date(row.created_at) > since) out.created.push(clean);
      else out.updated.push(clean);
    }
    return out;
  }

  private scopeFor(table: SyncTableName, userId: string, spaceIds: string[]) {
    const ids = sql.join(spaceIds.map((s) => sql`${s}`), sql`, `);

    switch (table) {
      case "users":
        // Only people who share a space with you, so avatars render offline
        // without leaking the whole user table.
        return {
          query: (since: Date) => sql`
            select distinct u.* from users u
            join memberships m on m.user_id = u.id
            where m.space_id in (${ids})
              and (u.updated_at > ${since} or u.deleted_at > ${since})
          `,
        };
      case "spaces":
        return {
          query: (since: Date) => sql`
            select * from spaces
            where id in (${ids}) and (updated_at > ${since} or deleted_at > ${since})
          `,
        };
      default:
        return {
          query: (since: Date) => sql`
            select * from ${sql.identifier(table)}
            where space_id in (${ids}) and (updated_at > ${since} or deleted_at > ${since})
          `,
        };
    }
  }

  private async appendRevocations(
    changes: Changes,
    revokedSpaceIds: string[],
    requestedTables: SyncTableName[]
  ): Promise<void> {
    const ids = sql.join(revokedSpaceIds.map((s) => sql`${s}`), sql`, `);

    for (const table of requestedTables) {
      if (table === "users") continue;
      const column = table === "spaces" ? sql`id` : sql`space_id`;
      const rows = (
        await this.db.execute(
          sql`select id from ${sql.identifier(table)} where ${column} in (${ids})`
        )
      ).rows as { id: string }[];

      const bucket = (changes[table] ??= { created: [], updated: [], deleted: [] });
      for (const r of rows) bucket.deleted.push(r.id);
    }
  }

  /**
   * WatermelonDB's push contract. Fully transactional, and it rejects the
   * whole batch if any row changed server-side since the client last pulled.
   */
  async push(userId: string, changes: Changes, lastPulledAt: number): Promise<void> {
    const since = new Date(lastPulledAt || 0);

    const roles = new Map(
      (
        await this.db
          .select({ spaceId: memberships.spaceId, role: memberships.role })
          .from(memberships)
          .where(and(eq(memberships.userId, userId), isNull(memberships.revokedAt)))
      ).map((m) => [m.spaceId, m.role])
    );

    await this.db.transaction(async (tx) => {
      for (const table of SYNC_TABLE_NAMES) {
        const batch = changes[table];
        if (!batch) continue;
        // The client cache of other people is read-only.
        if (table === "users" || table === "memberships") continue;

        for (const row of batch.created) {
          const spaceId = String(table === "spaces" ? row.id : row.space_id);
          this.assertCanWrite(roles.get(spaceId), table);
          await this.assertNotStale(tx, table, String(row.id), since);
          await this.upsert(tx, table, row, userId, true);
        }

        for (const row of batch.updated) {
          if (table === "goal_contributions") {
            throw new ConflictException("Goal contributions cannot be edited; delete and add a correction");
          }
          const spaceId = await this.spaceIdFor(tx, table, String(row.id));
          this.assertCanWrite(roles.get(spaceId), table);
          if (table !== "spaces" && String(row.space_id) !== spaceId) {
            throw new ForbiddenException("This item cannot be moved to another space");
          }
          await this.assertNotStale(tx, table, String(row.id), since);
          await this.upsert(tx, table, row, userId, false);
        }

        for (const id of batch.deleted) {
          const spaceId = await this.spaceIdFor(tx, table, id);
          this.assertCanWrite(roles.get(spaceId), table);
          await this.assertNotStale(tx, table, id, since);
          await tx.execute(
            sql`update ${sql.identifier(table)}
                set deleted_at = now(), updated_at = now()
                where id = ${id}`
          );
        }
      }
    });
  }

  private assertCanWrite(
    role: "owner" | "member" | "viewer" | undefined,
    table: SyncTableName
  ): void {
    const allowed = table === "spaces" ? role === "owner" : role === "owner" || role === "member";
    if (!allowed) {
      throw new ForbiddenException(
        role
          ? "You can view this space, but you cannot make changes"
          : "You no longer have access to this space"
      );
    }
  }

  private async spaceIdFor(tx: Db, table: SyncTableName, id: string): Promise<string> {
    const column = table === "spaces" ? sql`id` : sql`space_id`;
    const rows = (
      await tx.execute(
        sql`select ${column} as space_id from ${sql.identifier(table)} where id = ${id}`
      )
    ).rows as { space_id: string }[];
    if (!rows[0]) throw new ConflictException("This item no longer exists");
    return rows[0].space_id;
  }

  /**
   * Conflict detection. The protocol requires the push to be rejected if a
   * row moved server-side after the client's lastPulledAt — otherwise the
   * later writer silently overwrites a change they never saw.
   */
  private async assertNotStale(
    tx: Db,
    table: SyncTableName,
    id: string,
    since: Date
  ): Promise<void> {
    const rows = (
      await tx.execute(sql`select updated_at from ${sql.identifier(table)} where id = ${id}`)
    ).rows as { updated_at: Date }[];

    const existing = rows[0];
    if (existing && new Date(existing.updated_at) > since) {
      throw new ConflictException({
        message: "Someone else changed this while you were offline",
        table,
        id,
      });
    }
  }

  private async upsert(
    tx: Db,
    table: SyncTableName,
    row: Row,
    userId: string,
    created: boolean
  ): Promise<void> {
    const clean: Row = { ...row };
    for (const key of Object.keys(clean)) {
      if (key.startsWith("_") || NEVER_SEND.has(key)) delete clean[key];
    }
    // The token decides authorship at creation. Updates preserve the original
    // author even when another member corrects a shared entry.
    if (HAS_AUTHOR.has(table)) {
      if (created) clean.created_by = userId;
      else delete clean.created_by;
    }
    if (!created) delete clean.created_at;

    await this.validateFinancialRow(tx, table, clean, created);

    // WatermelonDB sends dates as epoch millis. Postgres cannot parse a bare
    // number as a timestamptz, so every push with a date failed until this
    // ran — the mirror of the coercion the pull side does.
    const dateColumns = DATE_COLUMNS[table];
    if (dateColumns) {
      for (const key of Object.keys(clean)) {
        if (!dateColumns.has(key)) continue;
        const v = clean[key];
        if (typeof v === "number") clean[key] = new Date(v);
        else if (typeof v === "string" && /^\d+$/.test(v)) clean[key] = new Date(Number(v));
      }
    }

    clean.updated_at = new Date();

    const cols = Object.keys(clean);
    if (!created) {
      const id = String(clean.id);
      const updates = sql.join(
        cols.filter((c) => c !== "id").map(
          (c) => sql`${sql.identifier(c)} = ${clean[c]}`
        ),
        sql`, `
      );
      await tx.execute(
        sql`update ${sql.identifier(table)} set ${updates} where id = ${id}`
      );
      return;
    }

    const identifiers = sql.join(cols.map((c) => sql.identifier(c)), sql`, `);
    const values = sql.join(cols.map((c) => sql`${clean[c]}`), sql`, `);
    const updates = sql.join(
      cols.filter((c) => c !== "id").map((c) => sql`${sql.identifier(c)} = excluded.${sql.identifier(c)}`),
      sql`, `
    );

    await tx.execute(
      sql`insert into ${sql.identifier(table)} (${identifiers}) values (${values})
          on conflict (id) do update set ${updates}`
    );
  }

  private async validateFinancialRow(
    tx: Db,
    table: SyncTableName,
    row: Row,
    created: boolean
  ): Promise<void> {
    if (table === "goals") {
      const name = String(row.name ?? "").trim();
      const target = Number(row.target_minor);
      if (!name || name.length > 60) throw new ConflictException("Goal name must be 1 to 60 characters");
      if (!Number.isSafeInteger(target) || target <= 0) {
        throw new ConflictException("Goal target must be a positive amount");
      }
      if (!isCurrency(String(row.currency))) throw new ConflictException("Goal currency is invalid");
      row.name = name;

      if (!created) {
        const current = (await tx.execute(
          sql`select currency from goals where id = ${String(row.id)} and deleted_at is null`
        )).rows as { currency: string }[];
        if (current[0] && current[0].currency !== row.currency) {
          throw new ConflictException("A goal's currency cannot be changed");
        }
      }
    }

    if (table === "goal_contributions") {
      const amount = Number(row.amount_minor);
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new ConflictException("Goal contribution must be a positive amount");
      }
      if (!isCurrency(String(row.currency))) {
        throw new ConflictException("Goal contribution currency is invalid");
      }
      const goal = (await tx.execute(
        sql`select space_id, currency from goals
            where id = ${String(row.goal_id)} and deleted_at is null`
      )).rows as { space_id: string; currency: string }[];
      if (!goal[0]) throw new ConflictException("This goal no longer exists");
      if (goal[0].space_id !== String(row.space_id)) {
        throw new ForbiddenException("A contribution cannot be moved to another space");
      }
      if (goal[0].currency !== row.currency) {
        throw new ConflictException("Contribution currency must match its goal");
      }
    }
  }
}

/**
 * Coerce every column to the type the shared manifest declares.
 *
 * This is not cosmetic. Postgres hands back timestamptz as a string on the raw
 * query path, and WatermelonDB stores date columns as epoch millis — so a
 * passed-through string lands in SQLite and every `where(occurred_at, gte(n))`
 * silently matches nothing. Coercing against the manifest fixes the whole
 * class of mismatch rather than one column at a time.
 */
function sanitize(table: SyncTableName, row: Row): Row {
  const columns = SYNC_SCHEMA[table] as Record<string, { type: string } | undefined>;
  const out: Row = {};

  for (const [k, v] of Object.entries(row)) {
    if (NEVER_SEND.has(k)) continue;

    const declared = columns[k]?.type;
    if (declared === undefined) {
      out[k] = v instanceof Date ? v.getTime() : v;
      continue;
    }

    if (v === null || v === undefined) {
      out[k] = null;
      continue;
    }

    switch (declared) {
      case "number":
        out[k] = toNumber(v);
        break;
      case "boolean":
        out[k] = v === true || v === "t" || v === "true" || v === 1;
        break;
      default:
        out[k] = String(v);
    }
  }
  return out;
}

function toNumber(v: unknown): number | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    // Postgres timestamptz on the raw query path, e.g. "2026-08-22 11:00:00+01".
    const parsed = Date.parse(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
