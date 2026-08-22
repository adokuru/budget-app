import { useEffect } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withSequence, withTiming,
} from "react-native-reanimated";
import { CATEGORY_COLORS, percentOf, type ColorKey, type Currency } from "@budget/shared";
import { Money } from "./money";
import { color, space, radius, type, CONTINUOUS, tint, spring } from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";

export function EnvelopeBar({
  name, colorKey, symbol, spentMinor, limitMinor, currency,
}: {
  name: string;
  colorKey: ColorKey;
  symbol: string;
  spentMinor: number;
  limitMinor: number;
  currency: Currency;
}) {
  const base = CATEGORY_COLORS[colorKey];
  const pct = percentOf(spentMinor, limitMinor) ?? 0;
  const over = pct > 100;
  const reduced = useReducedMotion();

  const fill = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    const target = Math.min(1, pct / 100);
    fill.value = reduced ? target : withSpring(target, spring.gentle);
    // One shake when an envelope tips over its limit. Once, not a loop.
    if (over && !reduced) {
      shake.value = withSequence(
        withTiming(-3, { duration: 60 }),
        withTiming(3, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
    }
  }, [pct, over, reduced, fill, shake]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <Animated.View
      style={[
        shakeStyle,
        {
          backgroundColor: color.card,
          borderRadius: radius.row,
          ...CONTINUOUS,
          padding: space.base,
          gap: space.sm,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View
          style={{
            width: 36, height: 36, borderRadius: radius.chip, ...CONTINUOUS,
            backgroundColor: tint(base), alignItems: "center", justifyContent: "center",
          }}
        >
          <Image source={`sf:${symbol}`} tintColor={base} style={{ width: 18, height: 18 }} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ ...type.body, color: color.ink }}>{name}</Text>
          <Text style={{ ...type.caption, color: over ? color.danger : color.muted }}>
            {over ? `${pct - 100}% over` : `${100 - pct}% left`}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Money minor={spentMinor} currency={currency} size="row" hideFraction
                 tone={over ? color.danger : color.ink} />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ ...type.caption, color: color.muted }}>of </Text>
            <Money minor={limitMinor} currency={currency} size="row" hideFraction tone={color.muted} />
          </View>
        </View>
      </View>

      <View
        style={{
          height: 8, borderRadius: radius.pill,
          backgroundColor: color.hairline, overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            fillStyle,
            { height: "100%", borderRadius: radius.pill, backgroundColor: over ? color.danger : base },
          ]}
        />
      </View>
    </Animated.View>
  );
}
