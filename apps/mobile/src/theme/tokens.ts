import type { TextStyle } from "react-native";
import { CATEGORY_COLORS, type ColorKey } from "@budget/shared";

/**
 * The single source of truth for the visual system.
 *
 * Light canvas, but the colour lives in solid category blocks rather than in
 * accents on white cards — the treatment from the LazyInterface reference.
 * A white card with a small coloured dot reads as a spreadsheet; a filled
 * block reads as money you can see at a glance.
 */

export const color = {
  canvas: "#F6F6F3",   // warm off-white, never pure white
  card: "#FFFFFF",
  ink: "#0E0E11",      // hero card background AND primary text
  inkSoft: "#1A1A20",  // raised surfaces on top of ink
  onInk: "#FFFFFF",
  muted: "#6B6B76",
  faint: "#9A9AA5",
  hairline: "#0000001A",
  accent: "#00A860",   // Nigerian green
  onAccent: "#FFFFFF",
  danger: "#E5484D",
  warning: "#F5A524",
  category: CATEGORY_COLORS,
} as const;

/**
 * Elements sitting on a saturated category block. Tinted white rather than a
 * fixed grey, so one set works on every category colour.
 */
export const onColor = {
  text: "#FFFFFF",
  subtext: "rgba(255,255,255,0.78)",
  chip: "rgba(255,255,255,0.22)",
  badge: "rgba(255,255,255,0.26)",
  track: "rgba(255,255,255,0.28)",
} as const;

/** Alpha tint of any hex, for icon pills and soft backgrounds. */
export function tint(hex: string, alpha = 0.12): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

/**
 * A slightly deeper partner for each category, so a filled row can carry a
 * gradient instead of reading as a flat swatch.
 */
export const CATEGORY_DEEP: Record<ColorKey, string> = {
  coral: "#E14F42",
  violet: "#6A56F0",
  emerald: "#1F8757",
  blue: "#2568D8",
  amber: "#DE8A0C",
  teal: "#0E9488",
  purple: "#7440E0",
  pink: "#D62E7F",
  orange: "#E15F0A",
  cyan: "#049CB4",
};

export const space = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, huge: 56,
} as const;

export const radius = {
  card: 24, row: 18, chip: 12, pill: 999,
} as const;

/** Apple's squircle. Every rounded corner that is not a capsule gets it. */
export const CONTINUOUS = { borderCurve: "continuous" } as const;

export const shadow = {
  /** Hero card and anything that should float above the canvas. */
  lifted: { boxShadow: "0 10px 30px rgba(14, 14, 17, 0.14)" },
  /** Coloured rows: a tinted shadow reads as the row's own light. */
  glow: (hex: string) => ({ boxShadow: `0 6px 18px ${tint(hex, 0.32)}` }),
  fab: { boxShadow: "0 6px 20px rgba(0, 168, 96, 0.35)" },
} as const;

/**
 * SF Pro for everything readable; Manrope for money numerals only.
 * One face to read, one face for money. Nothing italic, ever.
 */
export const MONEY_FONT = "Manrope_800ExtraBold";

export const type = {
  display: { fontFamily: MONEY_FONT, fontSize: 44, lineHeight: 48 },
  figure:  { fontFamily: MONEY_FONT, fontSize: 24, lineHeight: 28 },
  title:   { fontSize: 28, lineHeight: 34, fontWeight: "700" },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: "700" },
  body:    { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  label:   { fontSize: 14, lineHeight: 18, fontWeight: "500" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  micro:   { fontSize: 11, lineHeight: 14, fontWeight: "700",
             letterSpacing: 0.9, textTransform: "uppercase" },
  nano:    { fontSize: 10, lineHeight: 13, fontWeight: "600",
             letterSpacing: 0.6, textTransform: "uppercase" },
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
