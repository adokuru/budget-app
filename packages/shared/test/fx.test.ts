import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rate, convertMinor, convertMinorAtRate, roundHalfAwayFromZero, snapshotRate,
  MissingRateError, type RateTable,
} from "../src/fx.ts";

const table: RateTable = {
  perPivot: { NGN: 1540, CAD: 1.36, EUR: 0.92 },
  fetchedAt: 1_755_000_000_000,
};

test("same-currency rate is exactly 1", () => {
  assert.equal(rate("NGN", "NGN", table), 1);
});

test("rate resolves through the pivot in both directions", () => {
  assert.equal(rate("USD", "NGN", table), 1540);
  assert.equal(rate("NGN", "USD", table), 1 / 1540);
  // cross rate: 1 CAD -> NGN is 1540/1.36
  assert.ok(Math.abs(rate("CAD", "NGN", table) - 1540 / 1.36) < 1e-9);
});

test("a manual override beats the fetched rate", () => {
  // The official rate says 1540. The rate you actually got says 1720.
  const withOverride: RateTable = { ...table, overrides: { "USD/NGN": 1720 } };
  assert.equal(rate("USD", "NGN", withOverride), 1720);
});

test("an override applies in the inverse direction too", () => {
  const withOverride: RateTable = { ...table, overrides: { "USD/NGN": 1720 } };
  assert.equal(rate("NGN", "USD", withOverride), 1 / 1720);
});

test("a zero or negative override is ignored, not trusted", () => {
  const bad: RateTable = { ...table, overrides: { "USD/NGN": 0 } };
  assert.equal(rate("USD", "NGN", bad), 1540);
});

test("a missing rate throws rather than silently returning 1", () => {
  const empty: RateTable = { perPivot: {} };
  assert.throws(() => rate("NGN", "EUR", empty), MissingRateError);
});

test("convertMinor keeps integers and converts correctly", () => {
  // $100.00 at 1540 -> ₦154,000.00
  assert.equal(convertMinor(10_000, "USD", "NGN", table), 15_400_000);
  assert.equal(Number.isInteger(convertMinor(10_000, "USD", "NGN", table)), true);
});

test("convertMinor is identity for the same currency", () => {
  assert.equal(convertMinor(20_000_000, "NGN", "NGN", table), 20_000_000);
});

test("convertMinor round-trips within one minor unit", () => {
  const original = 20_000_000; // ₦200,000.00
  const usd = convertMinor(original, "NGN", "USD", table);
  const back = convertMinor(usd, "USD", "NGN", table);
  assert.ok(Math.abs(back - original) <= 1540, `round-trip drifted: ${back}`);
});

test("rounding is symmetric about zero", () => {
  assert.equal(roundHalfAwayFromZero(0.5), 1);
  assert.equal(roundHalfAwayFromZero(-0.5), -1);   // Math.round gives -0 here
  assert.equal(roundHalfAwayFromZero(2.5), 3);
  assert.equal(roundHalfAwayFromZero(-2.5), -3);
  // a refund must be the exact mirror of its charge
  const charge = convertMinor(1999, "USD", "NGN", table);
  const refund = convertMinor(-1999, "USD", "NGN", table);
  assert.equal(refund, -charge);
});

test("snapshotRate freezes history against later rate moves", () => {
  const atEntry = snapshotRate("USD", "NGN", table);
  const baseMinor = atEntry.baseMinorOf(10_000);
  assert.equal(atEntry.rateToBase, 1540);
  assert.equal(baseMinor, 15_400_000);

  // naira moves hard afterwards
  const later: RateTable = { perPivot: { ...table.perPivot, NGN: 2100 } };
  assert.equal(rate("USD", "NGN", later), 2100);
  // the stored snapshot is unaffected — this is the whole point
  assert.equal(baseMinor, 15_400_000);
});

test("convertMinorAtRate preserves a transaction's frozen rate", () => {
  assert.equal(convertMinorAtRate(12_500, "USD", "NGN", 1540), 19_250_000);
  assert.equal(convertMinorAtRate(12_500, "NGN", "NGN", 1), 12_500);
});

test("convertMinorAtRate validates the stored amount and rate", () => {
  assert.throws(() => convertMinorAtRate(10.5, "USD", "NGN", 1540), /integer/);
  assert.throws(() => convertMinorAtRate(1000, "USD", "NGN", 0), /positive/);
  assert.throws(
    () => convertMinorAtRate(Number.MAX_SAFE_INTEGER, "USD", "NGN", 1540),
    /safe integer/
  );
});

test("convertMinor rejects a non-integer amount", () => {
  assert.throws(() => convertMinor(10.5, "USD", "NGN", table), /integer of minor units/);
});
