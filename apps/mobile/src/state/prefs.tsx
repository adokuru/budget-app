import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { Appearance } from "react-native";
import { readJson, writeJson } from "@/lib/store";
import type { AppearancePreference } from "@/theme/tokens";

/**
 * Device-local preferences. Deliberately not synced — "hide decimals" is about
 * this phone, not about the household's books.
 */
export type Prefs = {
  appearance: AppearancePreference;
  hideDecimals: boolean;
  showBaseCurrency: boolean;
  haptics: boolean;
  confirmIncome: boolean;
  autoSync: boolean;
  dailyReminderEnabled: boolean;
  recurringReminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  recurringReminderDaysBefore: number;
};

const DEFAULTS: Prefs = {
  appearance: "system",
  hideDecimals: true,       // nobody counts kobo
  showBaseCurrency: false,
  haptics: true,
  confirmIncome: true,      // Nigerian salaries slip; ask by default
  autoSync: true,
  dailyReminderEnabled: false,
  recurringReminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  recurringReminderDaysBefore: 1,
};

const FILE = "prefs-v1.json";

type PrefsValue = Prefs & {
  setAppearance: (appearance: AppearancePreference) => void;
  setHideDecimals: (v: boolean) => void;
  setShowBaseCurrency: (v: boolean) => void;
  setHaptics: (v: boolean) => void;
  setConfirmIncome: (v: boolean) => void;
  setAutoSync: (v: boolean) => void;
  setDailyReminderEnabled: (v: boolean) => void;
  setRecurringReminderEnabled: (v: boolean) => void;
  setReminderTime: (hour: number, minute: number) => void;
  setRecurringReminderDaysBefore: (days: number) => void;
};

const PrefsContext = createContext<PrefsValue | null>(null);

export function usePrefs(): PrefsValue {
  const ctx = use(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return ctx;
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => ({
    ...DEFAULTS,
    ...(readJson<Partial<Prefs>>(FILE) ?? {}),
  }));

  useEffect(() => {
    Appearance.setColorScheme(prefs.appearance === "system" ? "unspecified" : prefs.appearance);
  }, [prefs.appearance]);

  const update = (patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writeJson(FILE, next);
      return next;
    });
  };

  return (
    <PrefsContext
      value={{
        ...prefs,
        setAppearance: (appearance) => update({ appearance }),
        setHideDecimals: (v) => update({ hideDecimals: v }),
        setShowBaseCurrency: (v) => update({ showBaseCurrency: v }),
        setHaptics: (v) => update({ haptics: v }),
        setConfirmIncome: (v) => update({ confirmIncome: v }),
        setAutoSync: (v) => update({ autoSync: v }),
        setDailyReminderEnabled: (v) => update({ dailyReminderEnabled: v }),
        setRecurringReminderEnabled: (v) => update({ recurringReminderEnabled: v }),
        setReminderTime: (hour, minute) => update({ reminderHour: hour, reminderMinute: minute }),
        setRecurringReminderDaysBefore: (days) => update({ recurringReminderDaysBefore: days }),
      }}
    >
      {children}
    </PrefsContext>
  );
}
