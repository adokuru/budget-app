import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { useDerivedValue, useSharedValue, withSpring } from "react-native-reanimated";
import { type Currency } from "@budget/shared";
import { Money } from "./money";
import { color, space, radius, type, CONTINUOUS, onColor, spring } from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";

/**
 * The spend trend on the insights card. A sparkline carries the shape of the
 * month in the space a single number would take.
 */
export function Sparkline({
  values, width = 300, height = 84, stroke = onColor.text,
}: { values: number[]; width?: number; height?: number; stroke?: string }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reduced ? 1 : withSpring(1, spring.gentle);
  }, [values.length, reduced, progress]);

  const full = useMemo(() => buildPath(values, width, height), [values, width, height]);

  const path = useDerivedValue(() => {
    const p = Skia.Path.MakeFromSVGString(full);
    if (!p) return Skia.Path.Make();
    // Trim reveals the line left to right rather than fading it in whole.
    const measure = Skia.ContourMeasureIter(p, false, 1);
    const contour = measure.next();
    if (!contour) return p;
    // getSegment returns the trimmed path; it does not fill an out-param.
    return contour.getSegment(0, contour.length() * progress.value, true);
  });

  if (values.length < 2) {
    return <View style={{ width, height }} />;
  }

  return (
    <Canvas style={{ width, height }}>
      <Path path={path} style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round"
            color={stroke} />
    </Canvas>
  );
}

function buildPath(values: number[], width: number, height: number): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 6;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return { x, y };
  });

  // Catmull-Rom style smoothing: a straight polyline looks like a chart from
  // a spreadsheet, a smoothed one looks drawn.
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export type DayBar = { label: string; value: number; isToday: boolean };

/**
 * The week at a glance, with today picked out in the accent colour. Bars are
 * plain views rather than Skia — seven rectangles do not need a canvas.
 */
export function WeeklyBars({
  days, currency, height = 120,
}: { days: DayBar[]; currency: Currency; height?: number }) {
  const max = Math.max(...days.map((d) => d.value), 1);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm, height }}>
      {days.map((d) => {
        const ratio = d.value / max;
        return (
          <View key={d.label} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            {d.value > 0 && (
              <Money minor={d.value} currency={currency} size="tiny"
                     tone={d.isToday ? color.ink : color.faint} hideFraction />
            )}
            <View
              style={{
                width: "100%",
                height: Math.max(4, ratio * (height - 44)),
                borderRadius: radius.chip,
                ...CONTINUOUS,
                backgroundColor: d.isToday ? color.accent : color.hairline,
              }}
            />
            <Text style={{ ...type.caption, color: d.isToday ? color.ink : color.faint,
                           fontWeight: d.isToday ? "700" : "400" }}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
