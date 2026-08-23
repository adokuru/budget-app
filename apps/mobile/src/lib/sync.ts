import { synchronize } from "@nozbe/watermelondb/sync";
import { database } from "@/db";
import { api, ApiError } from "./api";

export type SyncOutcome =
  | { status: "ok"; at: number }
  | { status: "conflict"; message: string }
  | { status: "offline" }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

let inFlight: Promise<SyncOutcome> | null = null;

/**
 * Drives WatermelonDB's sync against the NestJS endpoints.
 *
 * Calls are coalesced: sync fires on launch, on foreground and after writes,
 * and overlapping runs would push the same changes twice.
 */
export function sync(): Promise<SyncOutcome> {
  inFlight ??= run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function run(): Promise<SyncOutcome> {
  try {
    await synchronize({
      database,

      pullChanges: async ({ lastPulledAt }) => {
        const res = await api<{ changes: unknown; timestamp: number }>(
          `/sync/pull?lastPulledAt=${lastPulledAt ?? 0}`
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
    });

    return { status: "ok", at: Date.now() };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) return { status: "unauthenticated" };
      if (e.status === 409) {
        // Watermelon re-pulls and resolves on the next run, so this is a
        // "try again in a moment", not a failure the user must act on.
        return { status: "conflict", message: e.message };
      }
      return { status: "error", message: e.message };
    }
    // fetch() rejects rather than returning a status when there is no network.
    return { status: "offline" };
  }
}

/** Fire-and-forget, for places where the result is not worth surfacing. */
export function syncQuietly(): void {
  void sync().catch(() => {});
}
