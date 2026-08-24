import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextOccurrence, occurrencesBetween, describeRecurrence, ordinal,
  type Recurrence,
} from "../src/recurrence.ts";

const d = (s: string) => Date.parse(`${s}T00:00:00.000Z`);
const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString().slice(0, 10));

test("monthly fires on the requested day", () => {
  const salary: Recurrence = { freq: "monthly", dayOfMonth: 25, startOn: d("2026-01-25") };
  assert.equal(iso(nextOccurrence(salary, d("2026-01-25"))), "2026-02-25");
  assert.equal(iso(nextOccurrence(salary, d("2026-02-01"))), "2026-02-25");
  assert.equal(iso(nextOccurrence(salary, d("2026-02-26"))), "2026-03-25");
});

test("the 31st clamps to the last real day and never skips a month", () => {
  const rent: Recurrence = { freq: "monthly", dayOfMonth: 31, startOn: d("2026-01-31") };
  assert.equal(iso(nextOccurrence(rent, d("2026-01-31"))), "2026-02-28"); // 2026 is not a leap year
  assert.equal(iso(nextOccurrence(rent, d("2026-02-28"))), "2026-03-31");
  assert.equal(iso(nextOccurrence(rent, d("2026-03-31"))), "2026-04-30"); // April has 30
  assert.equal(iso(nextOccurrence(rent, d("2026-04-30"))), "2026-05-31");
});

test("the 29th lands on Feb 29 in a leap year", () => {
  const r: Recurrence = { freq: "monthly", dayOfMonth: 29, startOn: d("2028-01-29") };
  assert.equal(iso(nextOccurrence(r, d("2028-01-29"))), "2028-02-29");
  const notLeap: Recurrence = { freq: "monthly", dayOfMonth: 29, startOn: d("2026-01-29") };
  assert.equal(iso(nextOccurrence(notLeap, d("2026-01-29"))), "2026-02-28");
});

test("monthly with an interval skips the right number of months", () => {
  const r: Recurrence = { freq: "monthly", dayOfMonth: 1, interval: 3, startOn: d("2026-01-01") };
  assert.equal(iso(nextOccurrence(r, d("2026-01-01"))), "2026-04-01");
  assert.equal(iso(nextOccurrence(r, d("2026-04-01"))), "2026-07-01");
});

test("weekly lands on the requested weekday", () => {
  // 2026-08-24 is a Monday
  const r: Recurrence = { freq: "weekly", weekday: 1, startOn: d("2026-08-22") };
  assert.equal(iso(nextOccurrence(r, d("2026-08-22"))), "2026-08-24");
  assert.equal(iso(nextOccurrence(r, d("2026-08-24"))), "2026-08-31");
});

test("moving the cursor to today makes edits and resumes future-only", () => {
  const monthly: Recurrence = { freq: "monthly", dayOfMonth: 24, startOn: d("2026-08-24") };
  assert.equal(iso(nextOccurrence(monthly, d("2026-08-24"))), "2026-09-24");

  const weekly: Recurrence = { freq: "weekly", weekday: 1, startOn: d("2026-08-24") };
  assert.equal(iso(nextOccurrence(weekly, d("2026-08-24"))), "2026-08-31");
});

test("biweekly steps 14 days, not 7", () => {
  const r: Recurrence = { freq: "biweekly", weekday: 1, startOn: d("2026-08-22") };
  const first = nextOccurrence(r, d("2026-08-22"))!;
  const second = nextOccurrence(r, first)!;
  assert.equal((second - first) / 86_400_000, 14);
});

test("yearly steps twelve months", () => {
  const r: Recurrence = { freq: "yearly", dayOfMonth: 15, startOn: d("2026-06-15") };
  assert.equal(iso(nextOccurrence(r, d("2026-06-15"))), "2027-06-15");
});

test("a rule stops at endOn", () => {
  const r: Recurrence = {
    freq: "monthly", dayOfMonth: 1, startOn: d("2026-01-01"), endOn: d("2026-03-01"),
  };
  assert.equal(iso(nextOccurrence(r, d("2026-01-15"))), "2026-02-01");
  assert.equal(nextOccurrence(r, d("2026-03-01")), null);
});

test("occurrences never land before the start date", () => {
  const r: Recurrence = { freq: "monthly", dayOfMonth: 25, startOn: d("2026-06-25") };
  assert.equal(iso(nextOccurrence(r, d("2026-01-01"))), "2026-06-25");
});

test("catch-up returns every missed occurrence after time offline", () => {
  const rent: Recurrence = { freq: "monthly", dayOfMonth: 1, startOn: d("2026-01-01") };
  // Away from the app from January to May.
  const missed = occurrencesBetween(rent, d("2026-01-01"), d("2026-05-15"));
  assert.deepEqual(missed.map(iso), ["2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01"]);
});

test("catch-up is bounded and strictly increasing", () => {
  const r: Recurrence = { freq: "weekly", weekday: 3, startOn: d("2020-01-01") };
  const all = occurrencesBetween(r, d("2020-01-01"), d("2030-01-01"), 10);
  assert.equal(all.length, 10);
  for (let i = 1; i < all.length; i++) assert.ok(all[i]! > all[i - 1]!);
});

test("descriptions read like a human wrote them", () => {
  assert.equal(
    describeRecurrence({ freq: "monthly", dayOfMonth: 25, startOn: d("2026-01-25") }),
    "Monthly on the 25th"
  );
  assert.equal(
    describeRecurrence({ freq: "monthly", dayOfMonth: 1, interval: 3, startOn: d("2026-01-01") }),
    "Every 3 months on the 1st"
  );
  assert.equal(
    describeRecurrence({ freq: "biweekly", weekday: 5, startOn: d("2026-01-02") }),
    "Every 2 weeks on Friday"
  );
});

test("ordinals handle the teens", () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 31].map(ordinal),
    ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "31st"]);
});
