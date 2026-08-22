/**
 * Keypad input reducer. Pure, and deliberately not inside the component:
 * this is the code path that decides what number gets stored, so it is
 * tested directly rather than through the UI.
 */
export type AmountKey =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "." | "del";

/** Largest value we accept, keeping minor units inside safe-integer range. */
const MAX_MAJOR = Math.floor(Number.MAX_SAFE_INTEGER / 100);

export function applyKey(current: string, key: AmountKey, decimals = 2): string {
  if (key === "del") {
    return current.length <= 1 ? "0" : current.slice(0, -1);
  }

  if (key === ".") {
    if (decimals === 0) return current;
    return current.includes(".") ? current : `${current}.`;
  }

  // A leading zero is a placeholder, not a digit: "0" then "5" is "5".
  const base = current === "0" ? "" : current;

  const dot = base.indexOf(".");
  if (dot !== -1 && base.length - dot - 1 >= decimals) return base;

  const next = base + key;
  return Number(next) > MAX_MAJOR ? base : next;
}

/** What the keypad shows. Never an empty string, never a bare trailing dot value. */
export function displayAmount(raw: string): string {
  return raw === "" ? "0" : raw;
}
