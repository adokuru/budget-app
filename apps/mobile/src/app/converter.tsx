import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import {
  applyKey, toMinor, convertMinor, rate, CURRENCY_CODES,
  type AmountKey, type Currency,
} from "@budget/shared";
import { Keypad } from "@/components/keypad";
import { Amt } from "@/components/amt";
import { useTheme } from "@/hooks/use-theme";
import { useSpace } from "@/state/space";
import { space, radius, CONTINUOUS } from "@/theme/tokens";

export default function ConverterSheet() {
  const { color, type } = useTheme();
  const { baseCurrency, rates } = useSpace();
  const [from, setFrom] = useState<Currency>(baseCurrency);
  const [to, setTo] = useState<Currency>(baseCurrency === "NGN" ? "USD" : "NGN");
  const [raw, setRaw] = useState("0");

  const fromMinor = toMinor(raw || "0", from);
  let toMinorValue = 0;
  let rateLine = "";
  try {
    toMinorValue = convertMinor(fromMinor, from, to, rates);
    const r = rate(from, to, rates);
    const isOverride = Boolean(rates.overrides?.[`${from}/${to}`] || rates.overrides?.[`${to}/${from}`]);
    const asOf = rates.fetchedAt
      ? new Date(rates.fetchedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })
      : "not yet fetched";
    rateLine = `1 ${from} = ${r.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${to} · ${
      isOverride ? "your rate" : `auto, as of ${asOf}`
    }`;
  } catch {
    rateLine = `No rate available for ${from} → ${to}`;
  }

  const swap = () => {
    Haptics.selectionAsync();
    setFrom(to);
    setTo(from);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: space.xxl }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm,
        }}
      >
        <Pressable
          accessibilityLabel="Close converter"
          onPress={() => router.back()}
          style={{ minWidth: 64, minHeight: 48, justifyContent: "center", alignItems: "flex-start" }}
        >
          <Text style={{ ...type.body, color: color.faint }}>Close</Text>
        </Pressable>
        <Text style={{ ...type.body, fontWeight: "600", color: color.ink }}>Convert</Text>
        <View style={{ width: 64 }} />
      </View>

      <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
        <Side currency={from} onPick={setFrom} minor={fromMinor} active />
        <View style={{ alignItems: "center", marginVertical: -space.xs, zIndex: 1 }}>
          <Pressable
            accessibilityLabel="Swap currencies"
            onPress={swap}
            style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: color.surfaceStrong, alignItems: "center", justifyContent: "center",
            }}
          >
            <Image source="sf:arrow.up.arrow.down" tintColor={color.onStrong} style={{ width: 16, height: 16 }} />
          </Pressable>
        </View>
        <Side currency={to} onPick={setTo} minor={toMinorValue} />
        <Text style={{ ...type.rowSub, color: color.faint, textAlign: "center", marginTop: space.xs }}>
          {rateLine}
        </Text>
      </View>

      <View style={{ paddingHorizontal: space.lg, paddingTop: space.base, paddingBottom: space.lg }}>
        <Keypad onKey={(k: AmountKey) => setRaw((r) => applyKey(r, k))} />
      </View>
    </ScrollView>
  );
}

function Side({
  currency, onPick, minor, active = false,
}: {
  currency: Currency;
  onPick: (c: Currency) => void;
  minor: number;
  active?: boolean;
}) {
  const { color, type } = useTheme();
  const next = () => {
    const i = CURRENCY_CODES.indexOf(currency);
    Haptics.selectionAsync();
    onPick(CURRENCY_CODES[(i + 1) % CURRENCY_CODES.length]!);
  };

  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        backgroundColor: active ? color.surfaceStrong : color.surface,
        borderWidth: active ? 0 : 1, borderColor: color.hairline,
        borderRadius: radius.card, ...CONTINUOUS, padding: space.lg,
      }}
    >
      <Pressable
        accessibilityLabel={`${active ? "From" : "To"} currency, ${currency}`}
        accessibilityHint="Selects the next currency"
        onPress={next}
        style={{
          flexDirection: "row", alignItems: "center", gap: space.xs,
          minHeight: 48, paddingHorizontal: space.md,
          borderRadius: radius.pill,
          backgroundColor: active ? "#FFFFFF1A" : color.hairline,
        }}
      >
        <Text style={{ ...type.rowTitle, fontWeight: "600", color: active ? color.onStrong : color.ink }}>
          {currency}
        </Text>
        <Image
          source="sf:chevron.up.chevron.down"
          tintColor={active ? color.onStrong : color.faint}
          style={{ width: 10, height: 10 }}
        />
      </Pressable>

      <Amt
        minor={minor}
        currency={currency}
        size="lg"
        tone={active ? color.onStrong : color.ink}
      />
    </View>
  );
}
