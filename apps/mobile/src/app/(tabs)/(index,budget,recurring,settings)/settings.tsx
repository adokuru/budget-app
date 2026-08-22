import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  CURRENCIES, CURRENCY_CODES, PIVOT, rate as rateFor, type Currency,
} from "@budget/shared";
import { useSpace } from "@/state/space";
import { setOverride } from "@/lib/rates";
import { color, space, radius, type, CONTINUOUS } from "@/theme/tokens";

export default function SettingsScreen() {
  const { space: current, baseCurrency, displayCurrency, setDisplayCurrency, rates, refreshRates } =
    useSpace();

  const asOf = rates.fetchedAt
    ? new Date(rates.fetchedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : "not fetched yet";

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: 140 }}
    >
      <Group title="Space">
        <Row label="Name" value={current.name} />
        <Row label="Reports in" value={`${baseCurrency} · ${CURRENCIES[baseCurrency].name}`} />
      </Group>

      <Group title="Display currency" caption="Changes what amounts are shown in. Your stored history is untouched.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, padding: space.base }}>
          {CURRENCY_CODES.map((c) => {
            const active = c === displayCurrency;
            return (
              <Pressable
                key={c}
                onPress={() => { Haptics.selectionAsync(); setDisplayCurrency(c); }}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  height: 36, paddingHorizontal: space.md,
                  borderRadius: radius.pill,
                  backgroundColor: active ? color.ink : color.hairline,
                }}
              >
                <Text style={{ ...type.label, fontWeight: "600", color: active ? color.onInk : color.ink }}>
                  {CURRENCIES[c].symbol} {c}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Group>

      <Group
        title="Exchange rates"
        caption={`Auto rates from open.er-api.com, as of ${asOf}. Type your own if the rate you actually get differs — yours wins everywhere.`}
      >
        {CURRENCY_CODES.filter((c) => c !== PIVOT).map((quote) => (
          <RateRow key={quote} from={PIVOT} to={quote} onSaved={refreshRates} />
        ))}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); void refreshRates(); }}
          style={{ padding: space.base, borderTopWidth: 1, borderTopColor: color.hairline }}
        >
          <Text style={{ ...type.label, color: color.accent, fontWeight: "600" }}>
            Refresh rates now
          </Text>
        </Pressable>
      </Group>

      <Group title="Tools">
        <Link href="/converter" asChild>
          <Pressable
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              padding: space.base,
            }}
          >
            <Text style={{ ...type.body, color: color.ink }}>Currency converter</Text>
            <Image source="sf:chevron.right" tintColor={color.muted} style={{ width: 12, height: 12 }} />
          </Pressable>
        </Link>
      </Group>
    </ScrollView>
  );
}

function RateRow({
  from, to, onSaved,
}: { from: Currency; to: Currency; onSaved: () => void }) {
  const { rates } = useSpace();
  const overrideKey = `${from}/${to}`;
  const existing = rates.overrides?.[overrideKey];

  const auto = (() => {
    try {
      return rateFor(from, to, { perPivot: rates.perPivot });
    } catch {
      return null;
    }
  })();

  const [draft, setDraft] = useState(existing ? String(existing) : "");

  const commit = () => {
    const n = Number(draft.replace(/[,\s]/g, ""));
    setOverride(from, to, Number.isFinite(n) && n > 0 ? n : null);
    onSaved();
  };

  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: space.md,
        padding: space.base, borderTopWidth: 1, borderTopColor: color.hairline,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.body, color: color.ink }}>1 {from} → {to}</Text>
        <Text style={{ ...type.caption, color: existing ? color.accent : color.muted }}>
          {existing
            ? `Using your rate${auto ? ` · auto says ${auto.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""}`
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
        placeholderTextColor={color.hairline}
        style={{
          ...type.body, color: color.ink, textAlign: "right",
          minWidth: 96, paddingVertical: 8, paddingHorizontal: space.md,
          backgroundColor: color.canvas, borderRadius: radius.chip, ...CONTINUOUS,
        }}
      />
    </View>
  );
}

function Group({
  title, caption, children,
}: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={{ ...type.micro, color: color.muted }}>{title}</Text>
      <View style={{ backgroundColor: color.card, borderRadius: radius.card, ...CONTINUOUS }}>
        {children}
      </View>
      {caption && (
        <Text style={{ ...type.caption, color: color.muted, paddingHorizontal: space.xs }}>
          {caption}
        </Text>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        padding: space.base,
      }}
    >
      <Text style={{ ...type.body, color: color.ink }}>{label}</Text>
      <Text style={{ ...type.body, color: color.muted }}>{value}</Text>
    </View>
  );
}
