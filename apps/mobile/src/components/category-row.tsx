import { Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { CATEGORY_COLORS, percentOf, type ColorKey, type Currency } from "@budget/shared";
import { Money } from "./money";
import { color, space, radius, type, CONTINUOUS, tint } from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";

export function CategoryRow({
  name,
  colorKey,
  symbol,
  spentMinor,
  limitMinor,
  currency,
  index = 0,
}: {
  name: string;
  colorKey: ColorKey;
  symbol: string;
  spentMinor: number;
  limitMinor?: number;
  currency: Currency;
  index?: number;
}) {
  const c1 = CATEGORY_COLORS[colorKey];
  const pct = limitMinor ? percentOf(spentMinor, limitMinor) : null;
  const over = pct !== null && pct > 100;
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(index * 40).springify().damping(26)}
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
        <Image source={`sf:${symbol}`} tintColor={c1} style={{ width: 20, height: 20 }} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...type.body, color: color.ink }} numberOfLines={1}>
          {name}
        </Text>
        {pct !== null && (
          <Text style={{ ...type.caption, color: over ? color.danger : color.muted }}>
            {pct}% of limit
          </Text>
        )}
      </View>

      <Money minor={spentMinor} currency={currency} size="row" hideFraction />
    </Animated.View>
  );
}
