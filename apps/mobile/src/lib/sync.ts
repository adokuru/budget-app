import { synchronize } from "@nozbe/watermelondb/sync";
import { useSyncExternalStore } from "react";
import { database } from "@/db";
import { api, ApiError } from "./api";

export type SyncOutcome =
  | { status: "ok"; at: number }
  | { status: "conflict"; message: string }
  | { status: "offline" }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

export type SyncSnapshot = SyncOutcome | { status: "idle" } | { status: "syncing" };

let inFlight: Promise<SyncOutcome> | null = null;
let snapshot: SyncSnapshot = { status: "idle" };
const listeners = new Set<() => void>();

export const getSyncSnapshot = (): SyncSnapshot => snapshot;

export function subscribeToSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSyncStatus(): SyncSnapshot {
  return useSyncExternalStore(subscribeToSync, getSyncSnapshot, getSyncSnapshot);
}

function publish(next: SyncSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/**
 * Drives WatermelonDB's sync against the NestJS endpoints.
 *
 * Calls are coalesced: sync fires on launch, on foreground and after writes,
 * and overlapping runs would push the same changes twice.
 */
export function sync(): Promise<SyncOutcome> {
  if (!inFlight) {
    publish({ status: "syncing" });
    inFlight = run()
      .then((outcome) => {
        publish(outcome);
        return outcome;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

async function run(): Promise<SyncOutcome> {
  const first = await attempt();
  return first.status === "conflict" ? attempt() : first;
}

async function attempt(): Promise<SyncOutcome> {
  try {
    await synchronize({
      database,

      pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
        const migrationTables = migration?.tables.join(",") ?? "";
        const res = await api<{ changes: unknown; timestamp: number }>(
          `/sync/pull?lastPulledAt=${lastPulledAt ?? 0}` +
          `&schemaVersion=${schemaVersion}&migrationTables=${encodeURIComponent(migrationTables)}`
        );
        return { changes: res.changes as never, timestamp: res.timestamp };
      },

      pushChanges: async ({ changes, lastPulledAt }) => {
        await api<void>("/sync/push", {
          method: "POST",
          body: { changes, lastPulledAt },
        });
      },

      // The server sends every column, so Watermelon does not need to guess
      // which ones changed.
      sendCreatedAsUpdated: false,
      migrationsEnabledAtVersion: 1,
    });

    return { status: "ok", at: Date.now() };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) return { status: "unauthenticated" };
      if (e.status === 409) {
        return { status: "conflict", message: e.message };
      }
      return { status: "error", message: e.message };
    }
    const message = e instanceof Error ? e.message : "Synchronization failed";
    return /network request failed|failed to fetch|internet connection|offline/i.test(message)
      ? { status: "offline" }
      : { status: "error", message };
  }
}

/** Fire-and-forget, for places where the result is not worth surfacing. */
export function syncQuietly(): void {
  void sync().catch(() => {});
}
