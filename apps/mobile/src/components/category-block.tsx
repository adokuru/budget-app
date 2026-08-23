import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown, useAnimatedStyle, useSharedValue, withSpring,
} from "react-native-reanimated";
import { CATEGORY_COLORS, percentOf, type ColorKey, type Currency } from "@budget/shared";
import { Money } from "./money";
import { Badge } from "./badge";
import {
  CATEGORY_DEEP, onColor, color, space, radius, type, CONTINUOUS, shadow, spring,
} from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CategoryBlockProps = {
  name: string;
  colorKey: ColorKey;
  symbol: string;
  spentMinor: number;
  /** Monthly limit, when one is set. Drives the progress track and MAXED. */
  limitMinor?: number;
  /** This category's share of the month's total spend. */
  shareOfSpend?: number;
  currency: Currency;
  index?: number;
  onPress?: () => void;
};

/**
 * A solid colour block, not a white card with a coloured dot.
 *
 * The whole row carries the category's colour, with the icon, name, share and
 * amount sitting on it in tinted white. It is the single biggest reason the
 * reference screens read as designed rather than as a list of records.
 */
export function CategoryBlock({
  name, colorKey, symbol, spentMinor, limitMinor, shareOfSpend,
  currency, index = 0, onPress,
}: CategoryBlockProps) {
  const base = CATEGORY_COLORS[colorKey];
  const deep = CATEGORY_DEEP[colorKey];
  const pct = limitMinor ? percentOf(spentMinor, limitMinor) : null;
  const maxed = pct !== null && pct >= 100;

  const reduced = useReducedMotion();
  const press = useSharedValue(1);
  const fill = useSharedValue(0);

  useEffect(() => {
    const target = pct === null ? 0 : Math.min(1, pct / 100);
    fill.value = reduced ? target : withSpring(target, spring.gentle);
  }, [pct, reduced, fill]);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <AnimatedPressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${name}, ${pct === null ? "no limit" : `${pct}% of limit`}`}
      onPressIn={() => { if (!reduced && onPress) press.value = withSpring(0.98, spring.snappy); }}
      onPressOut={() => { press.value = withSpring(1, spring.snappy); }}
      onPress={onPress}
      entering={reduced ? undefined : FadeInDown.delay(index * 45).springify().damping(24)}
      style={[pressStyle, { borderRadius: radius.row, ...CONTINUOUS, ...shadow.glow(base) }]}
    >
      <LinearGradient
        colors={[base, deep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radius.row, ...CONTINUOUS,
          padding: space.base, gap: space.sm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <View
            style={{
              width: 38, height: 38, borderRadius: radius.chip, ...CONTINUOUS,
              backgroundColor: onColor.chip,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Image source={`sf:${symbol}`} tintColor={onColor.text} style={{ width: 19, height: 19 }} />
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ ...type.body, fontWeight: "700", color: onColor.text }} numberOfLines={1}>
                {name}
              </Text>
              {maxed && <Badge label="Maxed" background={onColor.badge} tone={onColor.text} />}
            </View>
            <Text style={{ ...type.caption, color: onColor.subtext }} numberOfLines={1}>
              {[
                shareOfSpend !== undefined ? `${shareOfSpend}% of spend` : null,
                pct !== null ? `${pct}% of limit` : null,
              ].filter(Boolean).join("  ·  ") || "No limit set"}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Money minor={spentMinor} currency={currency} size="row" tone={onColor.text} hideFraction />
            {limitMinor !== undefined && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ ...type.caption, color: onColor.subtext }}>of </Text>
                <Money minor={limitMinor} currency={currency} size="tiny"
                       tone={onColor.subtext} hideFraction />
              </View>
            )}
          </View>
        </View>

        {pct !== null && (
          <View
            style={{
              height: 5, borderRadius: radius.pill,
              backgroundColor: onColor.track, overflow: "hidden",
            }}
          >
            <Animated.View
              style={[fillStyle, { height: "100%", borderRadius: radius.pill, backgroundColor: onColor.text }]}
            />
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}
