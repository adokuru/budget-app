import { readJson, writeJson } from "./store";
import {
  PIVOT, CURRENCY_CODES, isCurrency,
  type Currency, type RateTable,
} from "@budget/shared";

const CACHE_KEY = "fx-cache-v1.json";
const OVERRIDES_KEY = "fx-overrides-v1.json";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Free, keyless, and returns every currency we support against USD. */
const ENDPOINT = `https://open.er-api.com/v6/latest/${PIVOT}`;

type Cached = { perPivot: Partial<Record<Currency, number>>; fetchedAt: number };

function readCache(): Cached | null {
  const parsed = readJson<Cached>(CACHE_KEY);
  return typeof parsed?.fetchedAt === "number" ? parsed : null;
}

export function readOverrides(): Record<string, number> {
  return readJson<Record<string, number>>(OVERRIDES_KEY) ?? {};
}

/**
 * Save the rate you actually get, which in Nigeria is rarely the official one.
 * Passing null clears the override and falls back to the fetched rate.
 */
export function setOverride(
  from: Currency,
  to: Currency,
  rate: number | null
): Record<string, number> {
  const all = readOverrides();
  const key = `${from}/${to}`;
  if (rate && rate > 0) all[key] = rate;
  else delete all[key];
  writeJson(OVERRIDES_KEY, all);
  return all;
}

async function fetchFresh(): Promise<Cached | null> {
  try {
    const res = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (body.result !== "success" || !body.rates) return null;

    const perPivot: Partial<Record<Currency, number>> = {};
    for (const code of CURRENCY_CODES) {
      const v = body.rates[code];
      if (isCurrency(code) && typeof v === "number" && v > 0) perPivot[code] = v;
    }
    if (Object.keys(perPivot).length === 0) return null;

    const cached: Cached = { perPivot, fetchedAt: Date.now() };
    writeJson(CACHE_KEY, cached);
    return cached;
  } catch {
    // Offline is normal, not exceptional. Fall back to the last good set.
    return null;
  }
}

/**
 * Rates for the app. Cached for a day, served stale when offline, and always
 * carrying `fetchedAt` so the UI can say how old they are rather than implying
 * they are live.
 */
export async function loadRates(force = false): Promise<RateTable> {
  const cached = readCache();
  const stale = !cached || Date.now() - cached.fetchedAt > MAX_AGE_MS;

  const fresh = force || stale ? await fetchFresh() : null;
  const chosen = fresh ?? cached;
  const overrides = readOverrides();

  return {
    // Seeded so the app is usable on a first launch with no network.
    perPivot: { ...FALLBACK, ...chosen?.perPivot },
    overrides,
    fetchedAt: chosen?.fetchedAt,
  };
}

/**
 * Only used before the first successful fetch. Deliberately roughly right
 * rather than absent, so a brand-new offline install still converts.
 */
const FALLBACK: Partial<Record<Currency, number>> = {
  NGN: 1349.67, USD: 1, CAD: 1.3763, EUR: 0.856,
  GBP: 0.7333, GHS: 10.5359, KES: 129.4215, ZAR: 16.0219,
};
