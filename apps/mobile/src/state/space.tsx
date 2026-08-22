import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { Currency, RateTable } from "@budget/shared";
import { ensureSeeded } from "@/db/seed";
import type { Space } from "@/db/models";
import { loadRates } from "@/lib/rates";

type SpaceContextValue = {
  space: Space;
  spaceId: string;
  baseCurrency: Currency;
  /** What amounts are displayed in. Defaults to the space's base currency. */
  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;
  rates: RateTable;
  refreshRates: () => Promise<void>;
};

const SpaceContext = createContext<SpaceContextValue | null>(null);

export function useSpace(): SpaceContextValue {
  const ctx = use(SpaceContext);
  if (!ctx) throw new Error("useSpace must be used inside <SpaceProvider>");
  return ctx;
}

export function SpaceProvider({ children }: { children: ReactNode }) {
  const [space, setSpace] = useState<Space | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<Currency | null>(null);
  const [rates, setRates] = useState<RateTable>({ perPivot: {} });

  const refreshRates = async () => setRates(await loadRates());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await ensureSeeded();
      const r = await loadRates();
      if (cancelled) return;
      setSpace(s);
      setDisplayCurrency(s.baseCurrency);
      setRates(r);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!space || !displayCurrency) return null;

  return (
    <SpaceContext
      value={{
        space,
        spaceId: space.id,
        baseCurrency: space.baseCurrency,
        displayCurrency,
        setDisplayCurrency,
        rates,
        refreshRates,
      }}
    >
      {children}
    </SpaceContext>
  );
}
