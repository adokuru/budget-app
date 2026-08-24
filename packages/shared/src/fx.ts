import { type Currency, assertMinor, CURRENCIES } from "./money.ts";

/**
 * Rates are held against a single pivot (USD), because that is what the
 * free rate APIs return. Any pair is then a division, so we never store
 * or refresh N^2 pairs.
 *
 * Manual overrides are checked first and win outright. In Nigeria the
 * official NGN rate and the rate you actually get are different numbers,
 * and the one you got is the true one for your budget.
 */
export const PIVOT: Currency = "USD";

export type RateTable = {
  /** Units of the keyed currency per 1 PIVOT. pivot itself is 1. */
  perPivot: Partial<Record<Currency, number>>;
  /** Keyed "FROM/TO". Wins over perPivot, in either direction. */
  overrides?: Record<string, number>;
  /** Epoch ms the auto rates were fetched. Surfaced in the UI as "as of ...". */
  fetchedAt?: number;
};

export class MissingRateError extends Error {
  // ponytail: fields assigned longhand, not as parameter properties —
  // Node's type-stripping cannot transform those, and we run tests on bare node.
  readonly from: Currency;
  readonly to: Currency;

  constructor(from: Currency, to: Currency) {
    super(`no rate available for ${from} -> ${to}`);
    this.name = "MissingRateError";
    this.from = from;
    this.to = to;
  }
}

/** How many units of `to` one unit of `from` buys. */
export function rate(from: Currency, to: Currency, table: RateTable): number {
  if (from === to) return 1;

  const o = table.overrides ?? {};
  const direct = o[`${from}/${to}`];
  if (isPositive(direct)) return direct;

  const inverse = o[`${to}/${from}`];
  if (isPositive(inverse)) return 1 / inverse;

  const fromPer = perPivot(from, table);
  const toPer = perPivot(to, table);
  if (!isPositive(fromPer) || !isPositive(toPer)) throw new MissingRateError(from, to);

  return toPer / fromPer;
}

function perPivot(c: Currency, table: RateTable): number | undefined {
  return c === PIVOT ? 1 : table.perPivot[c];
}

function isPositive(n: number | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/**
 * Convert minor units between currencies, rounding once at the end.
 * Currencies may have different decimal counts, so scale explicitly
 * rather than assuming both are 2dp.
 */
export function convertMinor(
  minor: number,
  from: Currency,
  to: Currency,
  table: RateTable
): number {
  assertMinor(minor);
  if (from === to) return minor;

  const scale = 10 ** (CURRENCIES[to].decimals - CURRENCIES[from].decimals);
  return roundHalfAwayFromZero(minor * rate(from, to, table) * scale);
}

/** Recalculate a stored amount without changing its historical FX snapshot. */
export function convertMinorAtRate(
  minor: number,
  from: Currency,
  to: Currency,
  frozenRate: number
): number {
  assertMinor(minor);
  if (!Number.isFinite(frozenRate) || frozenRate <= 0) {
    throw new Error(`frozen rate must be positive, got ${String(frozenRate)}`);
  }
  if (from === to) return minor;

  const scale = 10 ** (CURRENCIES[to].decimals - CURRENCIES[from].decimals);
  const converted = roundHalfAwayFromZero(minor * frozenRate * scale);
  assertMinor(converted);
  return converted;
}

/**
 * Half away from zero — what people expect of money, and symmetric about
 * zero so a refund rounds to the mirror of its charge. Math.round is not:
 * it rounds -0.5 to 0 but 0.5 to 1.
 */
export function roundHalfAwayFromZero(n: number): number {
  return n < 0 ? -Math.round(-n) : Math.round(n);
}

/**
 * The rate to store on a transaction at entry time, so historical
 * reporting never re-prices when the naira moves.
 */
export function snapshotRate(
  from: Currency,
  base: Currency,
  table: RateTable
): { rateToBase: number; baseMinorOf: (minor: number) => number } {
  const r = rate(from, base, table);
  return {
    rateToBase: r,
    baseMinorOf: (minor) => convertMinor(minor, from, base, table),
  };
}
