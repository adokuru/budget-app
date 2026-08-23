import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import {
  CURRENCIES, CURRENCY_CODES, PIVOT, rate as rateFor, type Currency,
} from "@budget/shared";
import { useSpace } from "@/state/space";
import { usePrefs } from "@/state/prefs";
import { setOverride } from "@/lib/rates";
import { Label, Rule } from "@/components/primitives";
import { SettingsNavRow, SettingsToggleRow } from "@/components/settings-row";
import { color, space, GUTTER, radius, type, CONTINUOUS } from "@/theme/tokens";

export default function CurrencyScreen() {
  const {
    baseCurrency, displayCurrency, setDisplayCurrency, rates, refreshRates,
  } = useSpace();
  const prefs = usePrefs();

  const asOf = rates.fetchedAt
    ? new Date(rates.fetchedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : "not fetched yet";

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: space.xxl }}
    >
      <Label>Display currency</Label>
      <View
        style={{
          flexDirection: "row", flexWrap: "wrap", gap: space.sm,
          paddingHorizontal: GUTTER, paddingBottom: space.base,
        }}
      >
        {CURRENCY_CODES.map((currency) => {
          const active = currency === displayCurrency;
          return (
            <Pressable
              key={currency}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => { Haptics.selectionAsync(); setDisplayCurrency(currency); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                paddingHorizontal: space.md, paddingVertical: 7,
                borderRadius: radius.pill,
                backgroundColor: active ? color.ink : color.chip,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? color.onAccent : color.ink }}>
                {CURRENCIES[currency].symbol}
              </Text>
              <Text style={{ fontSize: 12, color: active ? color.onAccent : color.faint }}>
                {currency}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ ...type.rowSub, paddingHorizontal: GUTTER, paddingBottom: space.base, lineHeight: 16 }}>
        Changes what amounts are shown in. Your stored history keeps the rate each
        entry was made at, so past months never re-price.
      </Text>

      <Rule />
      <SettingsToggleRow
        label="Hide decimals"
        sub="Whole naira only. Kobo rarely matters."
        value={prefs.hideDecimals}
        onChange={prefs.setHideDecimals}
      />
      <Rule />
      <SettingsToggleRow
        label="Show base currency too"
        sub={`Adds ${baseCurrency}, this space's reporting currency, under converted amounts.`}
        value={prefs.showBaseCurrency}
        onChange={prefs.setShowBaseCurrency}
      />

      <Label
        action={
          <Pressable onPress={() => { Haptics.selectionAsync(); void refreshRates(); }} hitSlop={10}>
            <Text style={type.action}>Refresh</Text>
          </Pressable>
        }
      >
        Exchange rates
      </Label>
      {CURRENCY_CODES.filter((currency) => currency !== PIVOT).map((quote, index, quotes) => (
        <View key={quote}>
          <RateRow from={PIVOT} to={quote} onSaved={refreshRates} />
          {index < quotes.length - 1 && <Rule />}
        </View>
      ))}
      <Text style={{ ...type.rowSub, paddingHorizontal: GUTTER, paddingVertical: space.md, lineHeight: 16 }}>
        Auto rates as of {asOf}. Type your own if the rate you actually get
        differs — yours wins everywhere.
      </Text>

      <Label>Tools</Label>
      <SettingsNavRow label="Currency converter" href="/converter" />
    </ScrollView>
  );
}

function RateRow({ from, to, onSaved }: { from: Currency; to: Currency; onSaved: () => void }) {
  const { rates } = useSpace();
  const existing = rates.overrides?.[`${from}/${to}`];

  const auto = (() => {
    try {
      return rateFor(from, to, { perPivot: rates.perPivot });
    } catch {
      return null;
    }
  })();

  const [draft, setDraft] = useState(existing ? String(existing) : "");

  const commit = () => {
    const next = Number(draft.replace(/[,\s]/g, ""));
    setOverride(from, to, Number.isFinite(next) && next > 0 ? next : null);
    onSaved();
  };

  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: space.md,
        paddingHorizontal: GUTTER, paddingVertical: space.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.rowTitleLg, color: color.ink }}>1 {from} → {to}</Text>
        <Text style={{ ...type.rowSub, color: existing ? color.accent : color.faint }}>
          {existing
            ? `Your rate${auto ? ` · auto ${auto.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""}`
            : auto
              ? `Auto ${auto.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "No rate yet"}
        </Text>
      </View>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="decimal-pad"
        returnKeyType="done"
        placeholder={auto ? auto.toFixed(2) : "—"}
        placeholderTextColor={color.fainter}
        style={{
          fontSize: 14, color: color.ink, textAlign: "right", minWidth: 88,
          paddingVertical: 7, paddingHorizontal: space.md,
          backgroundColor: color.chip, borderRadius: radius.chip, ...CONTINUOUS,
        }}
      />
    </View>
  );
}
