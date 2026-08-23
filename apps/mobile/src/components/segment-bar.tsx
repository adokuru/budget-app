import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { CATEGORY_COLORS, type ColorKey } from "@budget/shared";
import { color, radius, spring } from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";

export type Segment = { id: string; colorKey: ColorKey; value: number };

/**
 * The thin proportion bar under the balance. Shows the whole month's shape in
 * one glance before you read a single number — the detail that makes the
 * reference screens feel dense rather than empty.
 */
export function SegmentBar({ segments, height = 10 }: { segments: Segment[]; height?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0);

  if (total <= 0) {
    return (
      <View
        style={{ height, borderRadius: radius.pill, backgroundColor: color.hairline }}
      />
    );
  }

  return (
    <View style={{ flexDirection: "row", height, gap: 3 }}>
      {segments.map((s, i) => (
        <Slice
          key={s.id}
          index={i}
          fraction={s.value / total}
          tone={CATEGORY_COLORS[s.colorKey]}
          height={height}
        />
      ))}
    </View>
  );
}

function Slice({
  index, fraction, tone, height,
}: { index: number; fraction: number; tone: string; height: number }) {
  const grow = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    grow.value = reduced ? 1 : withDelay(index * 45, withSpring(1, spring.gentle));
  }, [fraction, index, reduced, grow]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.value }] }));

  return (
    <Animated.View
      style={[
        style,
        {
          flex: Math.max(fraction, 0.02),
          height,
          borderRadius: radius.pill,
          backgroundColor: tone,
          transformOrigin: "left",
        },
      ]}
    />
  );
}
