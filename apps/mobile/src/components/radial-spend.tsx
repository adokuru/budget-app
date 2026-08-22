import { useEffect } from "react";
import { View, Text } from "react-native";
import { Canvas, Path, Skia, Group } from "@shopify/react-native-skia";
import { useSharedValue, withDelay, withSpring, useDerivedValue } from "react-native-reanimated";
import { CATEGORY_COLORS, type ColorKey, type Currency } from "@budget/shared";
import { Money } from "./money";
import { color, space, type, spring } from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";

export type Segment = { id: string; colorKey: ColorKey; value: number };

const SIZE = 220;
const STROKE = 22;
const R = (SIZE - STROKE) / 2;
const GAP = 0.015; // radians of breathing room between arcs

function arc(startFrac: number, endFrac: number) {
  "worklet";
  const b = Skia.PathBuilder.Make();
  const sweep = (endFrac - startFrac) * 360;
  if (sweep <= 0) return b.build();
  b.addArc(
    { x: STROKE / 2, y: STROKE / 2, width: R * 2, height: R * 2 },
    startFrac * 360 - 90,
    sweep
  );
  return b.build();
}

/**
 * Segments draw on with a staggered spring rather than appearing instantly —
 * the eye follows the largest category first, which is the point of the chart.
 */
export function RadialSpend({
  segments,
  totalMinor,
  currency,
}: {
  segments: Segment[];
  totalMinor: number;
  currency: Currency;
}) {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    progress.value = 0;
    progress.value = reduced ? 1 : withDelay(80, withSpring(1, spring.gentle));
  }, [segments.length, totalMinor, reduced, progress]);

  const total = segments.reduce((a, s) => a + s.value, 0);

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Canvas style={{ width: SIZE, height: SIZE }}>
        <Group>
          {/* Track */}
          <Path
            path={arc(0, 1)}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
            color={color.hairline}
          />
          {segments.map((s, i) => {
            const before = segments.slice(0, i).reduce((a, x) => a + x.value, 0);
            const start = total > 0 ? before / total : 0;
            const end = total > 0 ? (before + s.value) / total : 0;
            return (
              <AnimatedArc
                key={s.id}
                start={start}
                end={Math.max(start, end - GAP)}
                progress={progress}
                index={i}
                tint={CATEGORY_COLORS[s.colorKey]}
              />
            );
          })}
        </Group>
      </Canvas>

      <View style={{ position: "absolute", alignItems: "center", gap: 2 }}>
        <Text style={{ ...type.micro, color: color.muted }}>Total spend</Text>
        <Money minor={totalMinor} currency={currency} size="figure" hideFraction />
      </View>
    </View>
  );
}

function AnimatedArc({
  start, end, progress, index, tint,
}: {
  start: number;
  end: number;
  progress: { value: number };
  index: number;
  tint: string;
}) {
  // Each segment starts 60ms after the previous one.
  const path = useDerivedValue(() => {
    const stagger = Math.min(1, Math.max(0, progress.value * 1.6 - index * 0.12));
    return arc(start, start + (end - start) * stagger);
  });

  return <Path path={path} style="stroke" strokeWidth={STROKE} strokeCap="round" color={tint} />;
}
