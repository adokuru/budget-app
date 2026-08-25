/**
 * Recurrence date maths. Dates only — no times, no timezones. Everything is
 * UTC midnight, because "rent on the 1st" is a calendar fact, not an instant.
 *
 * Pure and separate from the engine so the month-end cases can be tested
 * directly. Those are where recurrence code actually breaks.
 */
export type Freq = "monthly" | "weekly" | "biweekly" | "yearly";

export type Recurrence = {
  freq: Freq;
  /** 1-31 for monthly/yearly. Clamped to the month's real last day. */
  dayOfMonth?: number | null;
  /** 0 = Sunday … 6 = Saturday, for weekly/biweekly. */
  weekday?: number | null;
  /** Every N periods. 1 = every period. */
  interval?: number;
  startOn: number;
  endOn?: number | null;
};

export const utcDay = (ms: number): number => {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/** The device's calendar date encoded as UTC midnight for date-only storage. */
export const calendarDay = (ms: number): number => {
  const d = new Date(ms);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};

const DAY_MS = 86_400_000;

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/**
 * A rule set to the 31st must still fire in February and in 30-day months.
 * Clamping to the last real day is the behaviour people expect from
 * "the last working day" style rules, and it never skips a month.
 */
function monthlyOn(year: number, monthIndex: number, dayOfMonth: number): number {
  const day = Math.min(dayOfMonth, daysInMonth(year, monthIndex));
  return Date.UTC(year, monthIndex, day);
}

/**
 * The first occurrence strictly after `after`.
 * Returns null once the rule has ended.
 */
export function nextOccurrence(rule: Recurrence, after: number): number | null {
  const interval = Math.max(1, rule.interval ?? 1);
  const start = utcDay(rule.startOn);
  const cursorFloor = Math.max(utcDay(after), start - 1);

  let next: number | null = null;

  if (rule.freq === "monthly" || rule.freq === "yearly") {
    const step = rule.freq === "yearly" ? 12 * interval : interval;
    const s = new Date(start);
    const day = rule.dayOfMonth ?? s.getUTCDate();

    // Jump straight to the right period rather than looping month by month.
    const monthsElapsed =
      (new Date(cursorFloor).getUTCFullYear() - s.getUTCFullYear()) * 12 +
      (new Date(cursorFloor).getUTCMonth() - s.getUTCMonth());
    let k = Math.max(0, Math.floor(monthsElapsed / step));

    for (let guard = 0; guard < 64; guard++, k++) {
      const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + k * step, 1));
      const candidate = monthlyOn(d.getUTCFullYear(), d.getUTCMonth(), day);
      if (candidate > cursorFloor && candidate >= start) {
        next = candidate;
        break;
      }
    }
  } else {
    const strideDays = (rule.freq === "biweekly" ? 14 : 7) * interval;
    const stride = strideDays * 86_400_000;

    // Align the start to the requested weekday, if one was given.
    let first = start;
    if (rule.weekday != null) {
      const delta = (rule.weekday - new Date(start).getUTCDay() + 7) % 7;
      first = start + delta * 86_400_000;
    }

    if (first > cursorFloor) next = first;
    else {
      const steps = Math.floor((cursorFloor - first) / stride) + 1;
      next = first + steps * stride;
    }
  }

  if (next === null) return null;
  if (rule.endOn != null && next > utcDay(rule.endOn)) return null;
  return next;
}

/** The first occurrence on or after a calendar day. */
export function occurrenceOnOrAfter(rule: Recurrence, onOrAfter: number): number | null {
  return nextOccurrence(rule, utcDay(onOrAfter) - DAY_MS);
}

/**
 * Every occurrence in (from, to]. Used to catch up a rule after the app has
 * been closed for a while — without it, a week offline silently loses a week
 * of rent and salary.
 */
export function occurrencesBetween(
  rule: Recurrence,
  from: number,
  to: number,
  limit = 120
): number[] {
  const out: number[] = [];
  let cursor = from;
  for (let i = 0; i < limit; i++) {
    const next = nextOccurrence(rule, cursor);
    if (next === null || next > to) break;
    out.push(next);
    cursor = next;
  }
  return out;
}

/** Human label for a rule, e.g. "Monthly on the 25th". */
export function describeRecurrence(rule: Recurrence): string {
  const n = Math.max(1, rule.interval ?? 1);
  const every = n === 1 ? "" : `every ${n} `;

  if (rule.freq === "monthly" || rule.freq === "yearly") {
    const day = rule.dayOfMonth ?? new Date(utcDay(rule.startOn)).getUTCDate();
    const unit = rule.freq === "yearly" ? "year" : "month";
    return `${n === 1 ? (rule.freq === "yearly" ? "Yearly" : "Monthly") : `Every ${n} ${unit}s`} on the ${ordinal(day)}`;
  }

  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekday = rule.weekday ?? new Date(utcDay(rule.startOn)).getUTCDay();
  const base = rule.freq === "biweekly" ? "Every 2 weeks" : n === 1 ? "Weekly" : `Every ${n} weeks`;
  return `${base} on ${names[weekday]}`;
}

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
