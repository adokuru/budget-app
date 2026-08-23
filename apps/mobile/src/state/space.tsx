import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { isCurrency, type Currency, type RateTable } from "@budget/shared";
import { firstSpace } from "@/db/seed";
import { View } from "react-native";
import type { Space } from "@/db/models";
import { color } from "@/theme/tokens";
import { loadRates } from "@/lib/rates";
import { readJson, writeJson } from "@/lib/store";
import { runRecurring } from "@/lib/recurring-engine";

type SpaceContextValue = {
  space: Space;
  spaceId: string;
  baseCurrency: Currency;
  /** True for a shared space, which changes the header chip and shows authors. */
  isShared: boolean;
  /** What amounts are displayed in. Defaults to the space's base currency. */
  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;
  hideBalances: boolean;
  setHideBalances: (hide: boolean) => void;
  showMinorUnits: boolean;
  setShowMinorUnits: (show: boolean) => void;
  /** Switches the whole app to another space. */
  switchSpace: (id: string) => void;
  rates: RateTable;
  refreshRates: (force?: boolean) => Promise<void>;
};

const SpaceContext = createContext<SpaceContextValue | null>(null);

export function useSpace(): SpaceContextValue {
  const ctx = use(SpaceContext);
  if (!ctx) throw new Error("useSpace must be used inside <SpaceProvider>");
  return ctx;
}

export function SpaceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<DevicePreferences>(readPreferences);
  const [space, setSpace] = useState<Space | null>(null);
  const [spaceId, setSpaceIdState] = useState<string | null>(readActiveSpaceId());
  const [displayCurrency, setDisplayCurrency] = useState<Currency | null>(null);
  const [rates, setRates] = useState<RateTable>({ perPivot: {} });

  const refreshRates = async (force = false) => setRates(await loadRates(force));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Spaces arrive from the server on first sync; the app does not seed
      // them locally, so there is exactly one source of truth for membership.
      const s = await firstSpace(spaceId);
      const r = await loadRates();
      if (cancelled || !s) return;
      setSpace(s);
      const savedCurrency = readPreferences().displayCurrencyBySpace?.[s.id];
      setDisplayCurrency(savedCurrency && isCurrency(savedCurrency) ? savedCurrency : s.baseCurrency);
      setRates(r);

      // Catch up any recurring items that came due while the app was closed.
      // Idempotent, so a re-run never double-posts.
      void runRecurring(s.id, s.baseCurrency, r);
    })();
    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  if (!space || !displayCurrency) return <SpaceLoading />;

  return (
    <SpaceContext
      value={{
        space,
        spaceId: space.id,
        baseCurrency: space.baseCurrency,
        isShared: space.name.toLowerCase() !== "personal",
        displayCurrency,
        setDisplayCurrency: (currency) => {
          setDisplayCurrency(currency);
          setPreferences((current) => persistPreferences({
            ...current,
            displayCurrencyBySpace: {
              ...current.displayCurrencyBySpace,
              [space.id]: currency,
            },
          }));
        },
        hideBalances: preferences.hideBalances ?? false,
        setHideBalances: (hideBalances) => setPreferences((current) =>
          persistPreferences({ ...current, hideBalances })),
        showMinorUnits: preferences.showMinorUnits ?? true,
        setShowMinorUnits: (showMinorUnits) => setPreferences((current) =>
          persistPreferences({ ...current, showMinorUnits })),
        rates,
        refreshRates,
        switchSpace: (id) => {
          writeActiveSpaceId(id);
          setSpaceIdState(id);
        },
      }}
    >
      {children}
    </SpaceContext>
  );
}

const ACTIVE_SPACE_FILE = "active-space.json";
const PREFERENCES_FILE = "preferences.json";

type DevicePreferences = {
  displayCurrencyBySpace?: Record<string, Currency>;
  hideBalances?: boolean;
  showMinorUnits?: boolean;
};

const readPreferences = (): DevicePreferences =>
  readJson<DevicePreferences>(PREFERENCES_FILE) ?? {};

function persistPreferences(preferences: DevicePreferences): DevicePreferences {
  writeJson(PREFERENCES_FILE, preferences);
  return preferences;
}

const readActiveSpaceId = (): string | null =>
  readJson<{ id: string }>(ACTIVE_SPACE_FILE)?.id ?? null;

const writeActiveSpaceId = (id: string) => writeJson(ACTIVE_SPACE_FILE, { id });

/**
 * Shown while the first sync brings down the account's spaces. Deliberately
 * bare — a spinner over a blank canvas reads better than a skeleton of a
 * screen whose contents are not known yet.
 */
function SpaceLoading() {
  return <View style={{ flex: 1, backgroundColor: color.canvas }} />;
}
