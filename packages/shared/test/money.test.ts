import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toMinor, toMajor, formatParts, formatMoney, sumMinor, percentOf,
  assertMinor, isCurrency, CURRENCY_CODES,
} from "../src/money.ts";

test("toMinor scales without float drift", () => {
  assert.equal(toMinor(19.99, "USD"), 1999);      // 19.99*100 = 1998.9999... in binary
  assert.equal(toMinor(0.1, "USD"), 10);
  assert.equal(toMinor(0.29, "USD"), 29);
  assert.equal(toMinor(200_000, "NGN"), 20_000_000);
  assert.equal(toMinor("200,000", "NGN"), 20_000_000);
  assert.equal(toMinor("1 234.56", "USD"), 123456);
});

test("toMinor rejects garbage rather than silently producing NaN", () => {
  assert.throws(() => toMinor("abc", "NGN"), /not a number/);
  assert.throws(() => toMinor(Infinity, "NGN"), /not a number/);
});

test("toMinor round-trips through toMajor", () => {
  for (const v of [0, 1, 19.99, 200_000, 1_234_567.89]) {
    assert.equal(toMajor(toMinor(v, "NGN"), "NGN"), v);
  }
});

test("assertMinor rejects floats and unsafe integers", () => {
  assert.throws(() => assertMinor(10.5), /integer of minor units/);
  assert.throws(() => assertMinor(Number.MAX_SAFE_INTEGER + 2), /safe integer/);
  assert.doesNotThrow(() => assertMinor(-500));
});

test("formatParts splits for the raised-decimal treatment", () => {
  assert.deepEqual(formatParts(45_000_000, "NGN"),
    { sign: "", symbol: "₦", integer: "450,000", fraction: "00" });
  assert.deepEqual(formatParts(124_050, "USD"),
    { sign: "", symbol: "$", integer: "1,240", fraction: "50" });
});

test("formatParts keeps the sign separate and never emits +", () => {
  const neg = formatParts(-700_000, "NGN");
  assert.equal(neg.sign, "-");
  assert.equal(neg.integer, "7,000");   // integer part is unsigned
  assert.equal(formatParts(700_000, "NGN").sign, "");
});

test("formatParts pads the fraction", () => {
  assert.equal(formatParts(105, "USD").fraction, "05");
  assert.equal(formatParts(100, "USD").fraction, "00");
  assert.equal(formatParts(5, "USD").fraction, "05");
});

test("formatMoney renders a single line", () => {
  assert.equal(formatMoney(45_000_000, "NGN"), "₦450,000.00");
  assert.equal(formatMoney(-700_000, "NGN"), "-₦7,000.00");
});

test("sumMinor stays exact where floats would drift", () => {
  // 0.1 + 0.2 !== 0.3 in float; in minor units it is exact.
  assert.equal(sumMinor([10, 20]), 30);
  assert.equal(sumMinor(Array(10).fill(10)), 100);
  assert.equal(sumMinor([]), 0);
  assert.equal(sumMinor([-500, 200]), -300);
});

test("sumMinor refuses non-integer input instead of corrupting a total", () => {
  assert.throws(() => sumMinor([10, 0.5]), /integer of minor units/);
});

test("percentOf clamps and returns null when there is no limit", () => {
  assert.equal(percentOf(5_000, 10_000), 50);
  assert.equal(percentOf(15_000, 10_000), 150);   // over budget must not clamp high
  assert.equal(percentOf(-100, 10_000), 0);
  assert.equal(percentOf(100, 0), null);
});

test("currency guard", () => {
  assert.ok(isCurrency("NGN"));
  assert.ok(!isCurrency("GBP"));
  assert.deepEqual(CURRENCY_CODES, ["NGN", "USD", "CAD", "EUR"]);
});
