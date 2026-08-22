import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { DEFAULT_CATEGORIES, CATEGORY_COLORS, convertMinor, type RateTable } from "@budget/shared";
import { Money } from "@/components/money";
import { color, space, radius, type, CONTINUOUS, shadow, tint } from "@/theme/tokens";

// Phase 0 verification surface: exercises tokens, the money face, <Money> at
// every size, category colours and SF Symbols. Replaced by the real home in Phase 1.
const RATES: RateTable = { perPivot: { NGN: 1540, CAD: 1.36, EUR: 0.92 } };
const BALANCE_NGN = 45_000_000; // ₦450,000.00

const ROWS = DEFAULT_CATEGORIES.filter((c) => c.kind === "expense").slice(0, 5);
const SPENT = [12_400_00, 8_600_00, 35_000_00, 5_200_00, 22_000_00];

export default function HomeScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.huge }}
    >
      <View
        style={{
          backgroundColor: color.ink,
          borderRadius: radius.card,
          ...CONTINUOUS,
          ...shadow.lifted,
          padding: space.xl,
          gap: space.sm,
        }}
      >
        <Text style={{ ...type.micro, color: color.muted }}>Left to spend</Text>
        <Money minor={BALANCE_NGN} currency="NGN" size="display" tone={color.onInk} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          <Text style={{ ...type.caption, color: color.muted }}>≈</Text>
          <Money
            minor={convertMinor(BALANCE_NGN, "NGN", "USD", RATES)}
            currency="USD"
            size="row"
            tone={color.muted}
          />
        </View>
      </View>

      <Text style={{ ...type.heading, color: color.ink }}>Where it went</Text>

      <View style={{ gap: space.sm }}>
        {ROWS.map((c, i) => {
          const c1 = CATEGORY_COLORS[c.colorKey];
          return (
            <View
              key={c.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                backgroundColor: color.card,
                borderRadius: radius.row,
                ...CONTINUOUS,
                padding: space.base,
              }}
            >
              <View
                style={{
                  width: 40, height: 40,
                  borderRadius: radius.chip, ...CONTINUOUS,
                  backgroundColor: tint(c1),
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Image source={`sf:${c.symbol}`} tintColor={c1} style={{ width: 20, height: 20 }} />
              </View>
              <Text style={{ ...type.body, color: color.ink, flex: 1 }}>{c.name}</Text>
              <Money minor={SPENT[i]!} currency="NGN" size="row" hideFraction />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
