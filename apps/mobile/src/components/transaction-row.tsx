import { Text, View } from "react-native";
import { Image } from "expo-image";
import { CATEGORY_COLORS, type ColorKey, type Currency } from "@budget/shared";
import { Money } from "./money";
import { formatRelativeDay } from "@/lib/period";
import { color, space, radius, type, CONTINUOUS, tint } from "@/theme/tokens";

/** A single logged transaction. Quiet by design — the colour lives in the blocks above. */
export function TransactionRow({
  note, categoryName, colorKey, symbol, minor, currency, occurredAt, author,
}: {
  note: string;
  categoryName: string;
  colorKey: ColorKey;
  symbol: string;
  minor: number;
  currency: Currency;
  occurredAt: Date;
  /** Shown in shared spaces so you can see who spent it. */
  author?: string;
}) {
  const base = CATEGORY_COLORS[colorKey];

  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: space.md,
        backgroundColor: color.card, borderRadius: radius.row, ...CONTINUOUS,
        paddingVertical: space.md, paddingHorizontal: space.base,
      }}
    >
      <View
        style={{
          width: 34, height: 34, borderRadius: radius.chip, ...CONTINUOUS,
          backgroundColor: tint(base), alignItems: "center", justifyContent: "center",
        }}
      >
        <Image source={`sf:${symbol}`} tintColor={base} style={{ width: 16, height: 16 }} />
      </View>

      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ ...type.body, color: color.ink }} numberOfLines={1}>{note}</Text>
        <Text style={{ ...type.caption, color: color.faint }} numberOfLines={1}>
          {[categoryName, formatRelativeDay(occurredAt), author].filter(Boolean).join(" · ")}
        </Text>
      </View>

      <Money
        minor={minor}
        currency={currency}
        size="row"
        hideFraction
        tone={minor >= 0 ? color.accent : color.ink}
      />
    </View>
  );
}
