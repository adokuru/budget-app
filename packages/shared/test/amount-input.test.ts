import { test } from "node:test";
import assert from "node:assert/strict";
import { applyKey, type AmountKey } from "../src/amount-input.ts";
import { toMinor } from "../src/money.ts";

const type_ = (keys: string, start = "0") =>
  [...keys].reduce<string>((acc, k) => applyKey(acc, k as AmountKey), start);

test("typing replaces the placeholder zero", () => {
  assert.equal(applyKey("0", "5"), "5");
  assert.equal(type_("200000"), "200000");
});

test("does not accumulate leading zeros", () => {
  assert.equal(type_("0005"), "5");
});

test("allows exactly one decimal point", () => {
  assert.equal(type_("12.34"), "12.34");
  assert.equal(applyKey("12.34", "."), "12.34");
  assert.equal(applyKey("12.", "."), "12.");
});

test("caps the fraction at the currency's decimals", () => {
  assert.equal(applyKey("12.34", "5"), "12.34");
  assert.equal(applyKey("12.3", "4"), "12.34");
});

test("a zero-decimal currency rejects the decimal point entirely", () => {
  assert.equal(applyKey("1200", ".", 0), "1200");
});

test("delete walks back to zero and stops", () => {
  assert.equal(applyKey("120", "del"), "12");
  assert.equal(applyKey("1", "del"), "0");
  assert.equal(applyKey("0", "del"), "0");
});

test("delete removes the decimal point too", () => {
  assert.equal(applyKey("12.", "del"), "12");
});

test("refuses input that would exceed safe integer minor units", () => {
  const huge = "9".repeat(15);
  assert.equal(applyKey(huge, "9"), huge);
});

test("whatever the keypad produces converts to valid minor units", () => {
  for (const seq of ["200000", "12.34", "0.05", "1999.99"]) {
    const raw = type_(seq);
    const minor = toMinor(raw, "NGN");
    assert.ok(Number.isSafeInteger(minor), `${raw} -> ${minor}`);
  }
  assert.equal(toMinor(type_("200000"), "NGN"), 20_000_000);
  assert.equal(toMinor(type_("12.34"), "USD"), 1234);
});
