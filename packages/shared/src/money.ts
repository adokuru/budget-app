/**
 * Money is ALWAYS an integer count of minor units (kobo, cents).
 * Never a float, at any layer. Floats lose money: 0.1 + 0.2 !== 0.3.
 */

export const CURRENCIES = {
  NGN: { symbol: "₦", name: "Nigerian Naira", decimals: 2 },
  USD: { symbol: "$", name: "US Dollar", decimals: 2 },
  CAD: { symbol: "CA$", name: "Canadian Dollar", decimals: 2 },
  EUR: { symbol: "€", name: "Euro", decimals: 2 },
  GBP: { symbol: "£", name: "British Pound", decimals: 2 },
  GHS: { symbol: "GH₵", name: "Ghanaian Cedi", decimals: 2 },
  KES: { symbol: "KSh", name: "Kenyan Shilling", decimals: 2 },
  ZAR: { symbol: "R", name: "South African Rand", decimals: 2 },
} as const;

export type Currency = keyof typeof CURRENCIES;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as Currency[];

export function isCurrency(v: string): v is Currency {
  return v in CURRENCIES;
}

const factor = (c: Currency) => 10 ** CURRENCIES[c].decimals;

/** "1234.5" or 1234.5 -> 123450 minor units. Throws on garbage. */
export function toMinor(major: number | string, currency: Currency): number {
  const n = typeof major === "string" ? Number(major.replace(/[,\s]/g, "")) : major;
  if (!Number.isFinite(n)) throw new Error(`toMinor: not a number: ${String(major)}`);
  // Round the scaled value: 19.99 * 100 is 1998.9999... in binary float.
  return Math.round(n * factor(currency));
}

/** 123450 minor units -> 1234.5. For display and FX only, never for storage. */
export function toMajor(minor: number, currency: Currency): number {
  assertMinor(minor);
  return minor / factor(currency);
}

export function assertMinor(minor: number): void {
  if (!Number.isInteger(minor)) {
    throw new Error(`money must be an integer of minor units, got ${minor}`);
  }
  if (!Number.isSafeInteger(minor)) {
    throw new Error(`money exceeds safe integer range: ${minor}`);
  }
}

export type MoneyParts = {
  /** "-" for negative, "" otherwise. Never "+". */
  sign: string;
  symbol: string;
  /** Group-separated, e.g. "450,000". */
  integer: string;
  /** Always present, always padded, e.g. "00". Rendered raised. */
  fraction: string;
};

/**
 * Split a money value into the pieces <Money> renders.
 * The raised-decimal treatment needs the parts separately, so this
 * deliberately does not return a single formatted string.
 */
export function formatParts(minor: number, currency: Currency): MoneyParts {
  assertMinor(minor);
  const { decimals, symbol } = CURRENCIES[currency];
  const abs = Math.abs(minor);
  const f = factor(currency);

  const integer = new Intl.NumberFormat("en-NG", { useGrouping: true }).format(
    Math.trunc(abs / f)
  );
  const fraction = String(abs % f).padStart(decimals, "0");

  return { sign: minor < 0 ? "-" : "", symbol, integer, fraction };
}

/** Single-line form, for logs, tests, and accessibility labels. */
export function formatMoney(minor: number, currency: Currency): string {
  const { sign, symbol, integer, fraction } = formatParts(minor, currency);
  return `${sign}${symbol}${integer}.${fraction}`;
}

/** Sum minor units. Stays exact because everything is an integer. */
export function sumMinor(values: readonly number[]): number {
  let total = 0;
  for (const v of values) {
    assertMinor(v);
    total += v;
  }
  assertMinor(total);
  return total;
}

/**
 * Percentage of `spent` against `limit`, 0-decimal, clamped at 0.
 * Returns null when there is no limit to measure against, so callers
 * render "no budget" rather than a misleading 0%.
 */
export function percentOf(spent: number, limit: number): number | null {
  if (limit <= 0) return null;
  return Math.max(0, Math.round((spent / limit) * 100));
}
