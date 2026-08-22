import type { TextStyle } from "react-native";
import { CATEGORY_COLORS } from "@budget/shared";

/**
 * The single source of truth for the visual system.
 *
 * Light-first. Every value is semantic, so dark mode later is a second
 * values object here — not a refactor of every screen.
 */

export const color = {
  canvas: "#FAFAF8",   // warm off-white, never pure white
  card: "#FFFFFF",
  ink: "#111114",      // hero card background AND primary text
  onInk: "#FFFFFF",
  muted: "#6B6B76",
  hairline: "#0000001A",
  accent: "#00A860",   // Nigerian green
  onAccent: "#FFFFFF",
  danger: "#E5484D",
  category: CATEGORY_COLORS,
} as const;

/** 12% alpha tint of a category color, for icon pill backgrounds. */
export function tint(hex: string, alpha = 0.12): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

export const space = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, huge: 56,
} as const;

export const radius = {
  card: 24, row: 16, chip: 12, pill: 999,
} as const;

/** Apple's squircle. Applied to every rounded corner that is not a capsule. */
export const CONTINUOUS = { borderCurve: "continuous" } as const;

/** The only elevation in the app — hero card and FAB, nothing else. */
export const shadow = {
  lifted: { boxShadow: "0 8px 24px rgba(17, 17, 20, 0.10)" },
  fab: { boxShadow: "0 6px 20px rgba(0, 168, 96, 0.35)" },
} as const;

/**
 * SF Pro (system) for everything readable; Manrope for money numerals only.
 * One face to read, one face for money. Nothing italic, ever.
 */
export const MONEY_FONT = "Manrope_800ExtraBold";

export const type = {
  display: { fontFamily: MONEY_FONT, fontSize: 40, lineHeight: 44 },
  figure:  { fontFamily: MONEY_FONT, fontSize: 24, lineHeight: 28 },
  title:   { fontSize: 28, lineHeight: 34, fontWeight: "700" },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "600" },
  body:    { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  label:   { fontSize: 14, lineHeight: 18, fontWeight: "500" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  micro:   { fontSize: 11, lineHeight: 14, fontWeight: "600",
             letterSpacing: 0.88, textTransform: "uppercase" },
} as const;

/** Money always aligns in columns. */
export const TABULAR: { fontVariant: TextStyle["fontVariant"] } = {
  fontVariant: ["tabular-nums"],
};

/**
 * Physics, not durations. Three configs for the whole app — if a new
 * animation needs a fourth, it probably needs one of these instead.
 */
export const spring = {
  snappy: { damping: 20, stiffness: 300 },  // buttons, chips, taps
  smooth: { damping: 26, stiffness: 180 },  // cards, transitions
  gentle: { damping: 30, stiffness: 120 },  // numbers, charts, bars
} as const;
