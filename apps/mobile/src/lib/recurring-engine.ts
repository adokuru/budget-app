import { Q } from "@nozbe/watermelondb";
import {
  occurrencesBetween, nextOccurrence, calendarDay, utcDay, snapshotRate,
  type Currency, type RateTable, type Recurrence,
} from "@budget/shared";
import { database } from "@/db";
import type { RecurringRule, Transaction } from "@/db/models";
import { currentUserId } from "./session";

export type PendingConfirmation = {
  rule: RecurringRule;
  occurredAt: number;
};

const toRecurrence = (r: RecurringRule): Recurrence => ({
  freq: r.freq,
  dayOfMonth: r.dayOfMonth,
  weekday: r.weekday,
  interval: r.interval,
  startOn: r.startOn.getTime(),
  endOn: r.endOn?.getTime() ?? null,
});

/**
 * Runs on app open rather than only on a server cron, so the ledger is correct
 * for someone who has been offline for a week. Idempotent: an occurrence that
 * already has a transaction is never posted twice, so it is safe to call on
 * every launch and safe to race with a server-side run.
 */
export async function runRecurring(
  spaceId: string,
  baseCurrency: Currency,
  rates: RateTable,
  now: number = Date.now()
): Promise<PendingConfirmation[]> {
  const today = calendarDay(now);

  const rules = await database
    .get<RecurringRule>("recurring_rules")
    .query(Q.where("space_id", spaceId), Q.where("active", true))
    .fetch();

  const pending: PendingConfirmation[] = [];
  const toCreate: { rule: RecurringRule; at: number }[] = [];

  for (const rule of rules) {
    const from = rule.lastRunAt ? utcDay(rule.lastRunAt.getTime()) : utcDay(rule.startOn.getTime()) - 1;
    // lastRunAt is the handled-occurrence cursor. A missing transaction is not
    // enough to recover an older date because the user may have deleted it.
    const due = occurrencesBetween(toRecurrence(rule), from, today);

    for (const at of due) {
      if (await alreadyPosted(rule.id, at)) continue;
      if (rule.autoPost) toCreate.push({ rule, at });
      else pending.push({ rule, occurredAt: at });
    }
  }

  if (toCreate.length > 0) {
    await database.write(async () => {
      // SpaceProvider and the Recurring screen can both catch up on mount.
      // Recheck inside the serialized writer so they cannot create duplicates.
      const missing: typeof toCreate = [];
      for (const entry of toCreate) {
        if (!(await alreadyPosted(entry.rule.id, entry.at))) missing.push(entry);
      }
      if (missing.length === 0) return;

      const txns = database.get<Transaction>("transactions");
      await database.batch(
        ...missing.map(({ rule, at }) => {
          const { rateToBase, baseMinorOf } = snapshotRate(rule.currency, baseCurrency, rates);
          return txns.prepareCreate((t) => {
            t.spaceId = rule.spaceId;
            t.categoryId = rule.categoryId;
            t.createdBy = currentUserId();
            t.kind = rule.kind;
            t.amountMinor = rule.amountMinor;
            t.currency = rule.currency;
            t.rateToBase = rateToBase;
            t.baseMinor = baseMinorOf(rule.amountMinor);
            t.note = rule.label;
            t.occurredAt = new Date(at);
            t.recurringRuleId = rule.id;
          });
        })
      );
    });

    await stampRuns(toCreate);
  }

  return pending.sort((a, b) => a.occurredAt - b.occurredAt);
}

/** The dedupe key is (rule, occurrence date) — the only thing that makes a re-run safe. */
async function alreadyPosted(ruleId: string, at: number): Promise<boolean> {
  const count = await database
    .get<Transaction>("transactions")
    .query(Q.where("recurring_rule_id", ruleId), Q.where("occurred_at", at))
    .fetchCount();
  return count > 0;
}

async function stampRuns(entries: { rule: RecurringRule; at: number }[]): Promise<void> {
  const latest = new Map<string, { rule: RecurringRule; at: number }>();
  for (const e of entries) {
    const prev = latest.get(e.rule.id);
    if (!prev || e.at > prev.at) latest.set(e.rule.id, e);
  }

  await database.write(async () => {
    await database.batch(
      ...[...latest.values()].map(({ rule, at }) =>
        rule.prepareUpdate((r) => {
          r.lastRunAt = new Date(at);
          const next = nextOccurrence(toRecurrence(rule), at);
          if (next !== null) r.nextRunAt = new Date(next);
          else r.active = false;
        })
      )
    );
  });
}

/** Confirming a pending item posts it and advances that rule. */
export async function confirmPending(
  p: PendingConfirmation,
  baseCurrency: Currency,
  rates: RateTable
): Promise<void> {
  const { rule, occurredAt } = p;

  await database.write(async () => {
    // A stale screen or a second local caller may confirm the same occurrence.
    // The writer is serialized, so this check and create are atomic locally.
    if (!(await alreadyPosted(rule.id, occurredAt))) {
      const { rateToBase, baseMinorOf } = snapshotRate(rule.currency, baseCurrency, rates);
      await database.get<Transaction>("transactions").create((t) => {
        t.spaceId = rule.spaceId;
        t.categoryId = rule.categoryId;
        t.createdBy = currentUserId();
        t.kind = rule.kind;
        t.amountMinor = rule.amountMinor;
        t.currency = rule.currency;
        t.rateToBase = rateToBase;
        t.baseMinor = baseMinorOf(rule.amountMinor);
        t.note = rule.label;
        t.occurredAt = new Date(occurredAt);
        t.recurringRuleId = rule.id;
      });
    }

    const lastHandled = rule.lastRunAt ? utcDay(rule.lastRunAt.getTime()) : null;
    if (lastHandled === null || occurredAt > lastHandled) {
      await rule.update((r) => {
        r.lastRunAt = new Date(occurredAt);
        const next = nextOccurrence(toRecurrence(rule), occurredAt);
        if (next !== null) r.nextRunAt = new Date(next);
        else r.active = false;
      });
    }
  });
}

/** Projected total for the rest of this month — the Projected half of the hero card. */
export function projectedRemaining(
  rules: RecurringRule[],
  from: number,
  to: number
): { incomeMinor: number; expenseMinor: number } {
  let incomeMinor = 0;
  let expenseMinor = 0;

  for (const rule of rules) {
    if (!rule.active) continue;
    const hits = occurrencesBetween(toRecurrence(rule), from, to);
    const total = hits.length * rule.amountMinor;
    if (rule.kind === "income") incomeMinor += total;
    else expenseMinor += total;
  }

  return { incomeMinor, expenseMinor };
}
