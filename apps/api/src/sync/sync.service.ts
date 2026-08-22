import { Inject, Injectable, ConflictException } from "@nestjs/common";
import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { SYNC_TABLE_NAMES, type SyncTableName } from "@budget/shared";
import { DB, type Db } from "../db/db.module";
import {
  users, spaces, memberships, categories, transactions, recurringRules, budgets,
} from "../db/schema";

type Row = Record<string, unknown>;
export type TableChanges = { created: Row[]; updated: Row[]; deleted: string[] };
export type Changes = Partial<Record<SyncTableName, TableChanges>>;
export type PullResult = { changes: Changes; timestamp: number };

const TABLES = {
  users, spaces, memberships, categories, transactions, recurring_rules: recurringRules, budgets,
} as const;

/** Tables whose rows record who created them. */
const HAS_AUTHOR = new Set<SyncTableName>(["transactions", "spaces"]);

/** Columns that must never leave the server, even on the users table. */
const NEVER_SEND = new Set(["password_hash", "apple_sub", "google_sub", "deleted_at"]);

@Injectable()
export class SyncService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * WatermelonDB's pull contract. Everything is scoped through memberships —
   * the privacy boundary is this query, never a filter on the client.
   */
  async pull(userId: string, lastPulledAt: number): Promise<PullResult> {
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

    for (const table of SYNC_TABLE_NAMES) {
      changes[table] = await this.changesFor(table, userId, activeSpaceIds, since, isFirstPull);
    }

    // Being removed from a space must tombstone that space's rows. The
    // protocol has no other way to say "these are no longer yours", and
    // without it the device keeps a permanent copy of the family's finances.
    if (revokedSpaceIds.length > 0) {
      await this.appendRevocations(changes, revokedSpaceIds);
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
    const rows = (await this.db.execute(scope.query(since))).rows as Row[];

    const out: TableChanges = { created: [], updated: [], deleted: [] };
    for (const raw of rows) {
      const row = raw as Row & { id: string; deleted_at: Date | null; created_at: Date };
      if (row.deleted_at) {
        // A row created and deleted between two pulls was never seen by this
        // client, so sending its id as a deletion would be meaningless.
        if (!isFirstPull) out.deleted.push(row.id);
        continue;
      }
      const clean = sanitize(row);
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

  private async appendRevocations(changes: Changes, revokedSpaceIds: string[]): Promise<void> {
    const ids = sql.join(revokedSpaceIds.map((s) => sql`${s}`), sql`, `);

    for (const table of SYNC_TABLE_NAMES) {
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

    const allowed = new Set(
      (
        await this.db
          .select({ spaceId: memberships.spaceId })
          .from(memberships)
          .where(and(eq(memberships.userId, userId), isNull(memberships.revokedAt)))
      ).map((m) => m.spaceId)
    );

    await this.db.transaction(async (tx) => {
      for (const table of SYNC_TABLE_NAMES) {
        const batch = changes[table];
        if (!batch) continue;
        // The client cache of other people is read-only.
        if (table === "users" || table === "memberships") continue;

        for (const row of [...batch.created, ...batch.updated]) {
          const spaceId = String(table === "spaces" ? row.id : row.space_id);
          if (!allowed.has(spaceId)) {
            throw new ConflictException(`Not a member of space ${spaceId}`);
          }
          await this.assertNotStale(tx, table, String(row.id), since);
          await this.upsert(tx, table, row, userId);
        }

        for (const id of batch.deleted) {
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

  private async upsert(tx: Db, table: SyncTableName, row: Row, userId: string): Promise<void> {
    const clean: Row = { ...row };
    for (const key of Object.keys(clean)) {
      if (key.startsWith("_") || NEVER_SEND.has(key)) delete clean[key];
    }
    // Always stamp authorship from the token, whether or not the client sent
    // the field. Trusting a client-supplied created_by would let anyone
    // attribute their spending to another family member.
    if (HAS_AUTHOR.has(table)) clean.created_by = userId;
    clean.updated_at = new Date();

    const cols = Object.keys(clean);
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
}

function sanitize(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (NEVER_SEND.has(k)) continue;
    // WatermelonDB stores dates as epoch millis, not ISO strings.
    out[k] = v instanceof Date ? v.getTime() : v;
  }
  return out;
}
