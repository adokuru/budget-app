import { assertMinor, sumMinor } from "./money.ts";

export type GoalState = "active" | "overdue" | "completed";

export function goalTotal(amounts: readonly number[]): number {
  return sumMinor(amounts);
}

export function goalPercent(totalMinor: number, targetMinor: number): number {
  assertMinor(totalMinor);
  assertMinor(targetMinor);
  if (targetMinor <= 0) return 0;
  return Math.max(0, Math.round((totalMinor / targetMinor) * 100));
}

export function goalState(
  totalMinor: number,
  targetMinor: number,
  dueAt: number | null,
  now = Date.now()
): GoalState {
  if (totalMinor >= targetMinor) return "completed";
  return dueAt !== null && dueAt < startOfDay(now) ? "overdue" : "active";
}

function startOfDay(value: number): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
