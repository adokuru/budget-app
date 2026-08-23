import type { TextStyle } from "react-native";

/**
 * Kobo Tracker's modern-ledger palette: quiet paper, crisp white surfaces,
 * cobalt for navigation, lime for brand moments, and green only for money in.
 */

export const color = {
  canvas: "#F6F7F3",
  surface: "#FFFFFF",
  surfaceStrong: "#111A3A",
  /** Inset chips, numpad keys, avatars behind emoji. */
  chip: "#F0F1EC",
  chipAlt: "#ECEEF8",
  pressed: "#F1F2EE",

  ink: "#11162A",
  body: "#555A68",
  faint: "#8A8F9E",
  fainter: "#B9BDC7",

  hairline: "#E8EAE4",
  border: "#DADDD5",

  accent: "#3157F5",
  accentDeep: "#213CAD",
  brandLime: "#D8FF3E",
  positive: "#00A860",
  onAccent: "#FFFFFF",
  danger: "#E5383B",
  warning: "#F59E0B",
} as const;

/**
 * One colour per category, no tinted background — the design uses the colour
 * only on the progress bar and the odd inline figure.
 */
export const CATEGORY_COLORS = {
  coral: "#E8643A",   // Food
  blue: "#3570E2",    // Transport
  amber: "#D4860A",   // Bills & PHCN
  violet: "#7B5CE8",  // Data & Airtime
  pink: "#D4477A",    // Shopping
  emerald: "#00A860", // Savings & Ajo
  brown: "#92400E",   // Rent
  teal: "#0D7D8A",    // School fees
  purple: "#6240D4",  // Family support
  crimson: "#C0293A", // Health
} as const;

export type ColorKey = keyof typeof CATEGORY_COLORS;

/** Alpha tint of any hex, for the rare soft background. */
export function tint(hex: string, alpha = 0.12): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

/** The design works on a 20px gutter and a 4px rhythm. */
export const space = {
  xs: 4, sm: 8, md: 12, base: 14, lg: 20, xl: 24, xxl: 32, huge: 48,
} as const;

export const GUTTER = 20;

export const radius = {
  sheet: 24, card: 18, chip: 12, pill: 999,
} as const;

/** Apple's squircle. Every rounded corner that is not a capsule gets it. */
export const CONTINUOUS = { borderCurve: "continuous" } as const;

export const shadow = {
  fab: { boxShadow: "0 6px 18px rgba(49, 87, 245, 0.34)" },
  card: { boxShadow: "0 2px 10px rgba(17, 22, 42, 0.05)" },
  sheet: { boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.12)" },
} as const;

/**
 * Plus Jakarta Sans ExtraBold for figures, titles and nav labels — exactly
 * where the design applies it. Everything else is the system face.
 */
export const DISPLAY_FONT = "PlusJakartaSans_800ExtraBold";
export const DISPLAY_FONT_BOLD = "PlusJakartaSans_700Bold";

export const type = {
  /** Section eyebrows: 10px, extrabold, wide tracking, uppercase. */
  eyebrow: {
    fontSize: 10, lineHeight: 14, fontWeight: "800",
    letterSpacing: 1.4, textTransform: "uppercase", color: color.faint,
  },
  screenTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
  rowTitle: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  rowTitleLg: { fontSize: 14, lineHeight: 19, fontWeight: "500" },
  rowSub: { fontSize: 11, lineHeight: 15, fontWeight: "400", color: color.faint },
  body: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: "400", color: color.faint },
  action: { fontSize: 11, lineHeight: 15, fontWeight: "700", color: color.accent },
  statLabel: {
    fontSize: 10, lineHeight: 13, fontWeight: "600",
    letterSpacing: 0.5, textTransform: "uppercase", color: color.faint,
  },
} as const;

/** Money always aligns in columns. */
export const TABULAR: { fontVariant: TextStyle["fontVariant"] } = {
  fontVariant: ["tabular-nums"],
};
