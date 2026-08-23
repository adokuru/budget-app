import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type Currency } from "@budget/shared";
import { AnimatedMoney } from "./animated-money";
import { Money } from "./money";
import { SegmentBar, type Segment } from "./segment-bar";
import { color, space, radius, type, CONTINUOUS, shadow, onColor } from "@/theme/tokens";

/**
 * The hero. Ink base with a faint green wash, because a flat black rectangle
 * is the difference between "a card" and "the thing you open the app for".
 */
export function HeroCard({
  label, minor, currency, segments, spentMinor, limitMinor, deltaPct, onPressPeriod, period,
}: {
  label: string;
  minor: number;
  currency: Currency;
  segments: Segment[];
  spentMinor: number;
  limitMinor?: number;
  deltaPct?: number | null;
  period: string;
  onPressPeriod?: () => void;
}) {
  const negative = minor < 0;

  return (
    <LinearGradient
      colors={[color.inkSoft, color.ink]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: radius.card, ...CONTINUOUS, ...shadow.lifted,
        padding: space.xl, gap: space.md, overflow: "hidden",
      }}
    >
      {/* A soft accent bloom in the corner. The graded feel, without a LUT. */}
      <LinearGradient
        colors={["rgba(0,168,96,0.30)", "rgba(0,168,96,0)"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 0.9 }}
        style={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: 130 }}
      />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ ...type.micro, color: onColor.subtext }}>{label}</Text>
        <Pressable
          onPress={onPressPeriod}
          style={{
            flexDirection: "row", alignItems: "center", gap: 5,
            paddingVertical: 5, paddingHorizontal: space.md,
            borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={{ ...type.label, fontWeight: "600", color: onColor.text }}>{period}</Text>
          <Image source="sf:chevron.down" tintColor={onColor.subtext} style={{ width: 9, height: 9 }} />
        </Pressable>
      </View>

      {/*
        The balance owns its own line. Sitting the spent/budgeted pair beside it
        clipped as soon as the number grew past six figures — which for naira
        is every month.
      */}
      <AnimatedMoney
        minor={minor}
        currency={currency}
        size={40}
        tone={negative ? "#FF7A7E" : onColor.text}
      />

      {limitMinor !== undefined && limitMinor > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
          <Money minor={spentMinor} currency={currency} size="row" tone={onColor.text} hideFraction />
          <Text style={{ ...type.caption, color: onColor.subtext }}>  spent of  </Text>
          <Money minor={limitMinor} currency={currency} size="row" tone={onColor.subtext} hideFraction />
        </View>
      )}

      <SegmentBar segments={segments} />

      {deltaPct !== undefined && deltaPct !== null && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              flexDirection: "row", alignItems: "center", gap: 3,
              paddingVertical: 3, paddingHorizontal: 8,
              borderRadius: radius.pill,
              backgroundColor: deltaPct <= 0 ? "rgba(0,168,96,0.22)" : "rgba(229,72,77,0.22)",
            }}
          >
            <Image
              source={deltaPct <= 0 ? "sf:arrow.down.right" : "sf:arrow.up.right"}
              tintColor={deltaPct <= 0 ? "#5BE39B" : "#FF7A7E"}
              style={{ width: 9, height: 9 }}
            />
            <Text style={{ ...type.nano, color: deltaPct <= 0 ? "#5BE39B" : "#FF7A7E" }}>
              {Math.abs(deltaPct)}%
            </Text>
          </View>
          <Text style={{ ...type.caption, color: onColor.subtext }}>vs last month</Text>
        </View>
      )}
    </LinearGradient>
  );
}
