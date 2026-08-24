import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import {
  CURRENCIES, CURRENCY_CODES, PIVOT, rate as rateFor, type Currency,
} from "@budget/shared";
import { useSpace } from "@/state/space";
import { usePrefs } from "@/state/prefs";
import { setOverride } from "@/lib/rates";
import { Label, Rule, SectionCard } from "@/components/primitives";
import { SettingsNavRow, SettingsToggleRow } from "@/components/settings-row";
import { useTheme } from "@/hooks/use-theme";
import { space, GUTTER, radius, CONTINUOUS } from "@/theme/tokens";

export default function CurrencyScreen() {
  const { color, type } = useTheme();
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
                backgroundColor: active ? color.surfaceStrong : color.chip,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? color.onStrong : color.ink }}>
                {CURRENCIES[currency].symbol}
              </Text>
              <Text style={{ fontSize: 12, color: active ? color.onStrong : color.faint }}>
                {currency}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ ...type.rowSub, paddingHorizontal: GUTTER, paddingBottom: space.base, lineHeight: 16 }}>
        Only the display changes. Past entries keep the exchange rate used when you added them.
      </Text>

      <SectionCard>
        <SettingsToggleRow
          label="Hide decimals"
          sub="Show whole amounts only."
          value={prefs.hideDecimals}
          onChange={prefs.setHideDecimals}
        />
        <Rule full />
        <SettingsToggleRow
          label="Show base currency too"
          sub={`Also show amounts in ${baseCurrency}, this space's main currency.`}
          value={prefs.showBaseCurrency}
          onChange={prefs.setShowBaseCurrency}
        />
      </SectionCard>

      <Label
        action={
          <Pressable onPress={() => { Haptics.selectionAsync(); void refreshRates(); }} hitSlop={10}>
            <Text style={type.action}>Refresh</Text>
          </Pressable>
        }
      >
        Exchange rates
      </Label>
      <SectionCard>
        {CURRENCY_CODES.filter((currency) => currency !== PIVOT).map((quote, index, quotes) => (
          <View key={quote}>
            <RateRow from={PIVOT} to={quote} onSaved={refreshRates} />
            {index < quotes.length - 1 && <Rule full />}
          </View>
        ))}
      </SectionCard>
      <Text style={{ ...type.rowSub, paddingHorizontal: GUTTER, paddingVertical: space.md, lineHeight: 16 }}>
        Automatic rates updated {asOf}. Enter your own rate to use it instead.
      </Text>

      <Label>Tools</Label>
      <SectionCard>
        <SettingsNavRow label="Currency converter" href="/converter" />
      </SectionCard>
    </ScrollView>
  );
}

function RateRow({ from, to, onSaved }: { from: Currency; to: Currency; onSaved: () => void }) {
  const { color, type } = useTheme();
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
