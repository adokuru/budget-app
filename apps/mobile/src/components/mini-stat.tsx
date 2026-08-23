import { Text, View } from "react-native";
import { Image } from "expo-image";
import type { Currency } from "@budget/shared";
import { Money } from "./money";
import { color, space, radius, type, CONTINUOUS, tint } from "@/theme/tokens";

export function MiniStat({
  label, minor, currency, symbol, tone,
}: {
  label: string;
  minor: number;
  currency: Currency;
  symbol: string;
  tone: string;
}) {
  return (
    <View
      style={{
        flex: 1, backgroundColor: color.card, borderRadius: radius.row, ...CONTINUOUS,
        padding: space.base, gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View
          style={{
            width: 22, height: 22, borderRadius: 11, backgroundColor: tint(tone, 0.14),
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Image source={`sf:${symbol}`} tintColor={tone} style={{ width: 11, height: 11 }} />
        </View>
        <Text style={{ ...type.caption, color: color.muted }}>{label}</Text>
      </View>
      <Money minor={minor} currency={currency} size="row" hideFraction />
    </View>
  );
}
