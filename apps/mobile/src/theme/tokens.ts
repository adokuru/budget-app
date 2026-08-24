import type { ColorSchemeName, TextStyle } from "react-native";

/** Kobo Tracker stays cobalt and lime; only its neutral materials adapt. */
export const lightColor = {
  canvas: "#F6F7F3",
  surface: "#FFFFFF",
  surfaceStrong: "#111A3A",
  chip: "#F0F1EC",
  chipAlt: "#ECEEF8",
  pressed: "#F1F2EE",
  ink: "#11162A",
  body: "#555A68",
  faint: "#656A78",
  fainter: "#696E7C",
  hairline: "#E2E5DE",
  border: "#D3D7CF",
  accent: "#3157F5",
  accentDeep: "#213CAD",
  brandLime: "#D8FF3E",
  positive: "#00864D",
  onPositive: "#FFFFFF",
  onBrand: "#11162A",
  onStrong: "#FFFFFF",
  onAccent: "#FFFFFF",
  danger: "#CF2934",
  warning: "#A65C00",
} as const;

export type AppColor = { readonly [K in keyof typeof lightColor]: string };

export const darkColor: AppColor = {
  canvas: "#090D1A",
  surface: "#11172A",
  surfaceStrong: "#17245A",
  chip: "#171E31",
  chipAlt: "#1B2547",
  pressed: "#1B2336",
  ink: "#F5F7FF",
  body: "#C4CAD8",
  faint: "#9AA3B8",
  fainter: "#7C869C",
  hairline: "#242C40",
  border: "#333C54",
  accent: "#7088FF",
  accentDeep: "#8EA3FF",
  brandLime: "#D8FF3E",
  positive: "#3AD995",
  onPositive: "#07140E",
  onBrand: "#11162A",
  onStrong: "#FFFFFF",
  onAccent: "#090D1A",
  danger: "#FF6973",
  warning: "#F4B74A",
};

/** Category colours retain meaning when the device appearance changes. */
export const CATEGORY_COLORS = {
  coral: "#E8643A",
  blue: "#3570E2",
  amber: "#D4860A",
  violet: "#7B5CE8",
  pink: "#D4477A",
  emerald: "#00A860",
  brown: "#92400E",
  teal: "#0D7D8A",
  purple: "#6240D4",
  crimson: "#C0293A",
} as const;

export type ColorKey = keyof typeof CATEGORY_COLORS;

export function tint(hex: string, alpha = 0.12): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

export const space = {
  xs: 4, sm: 8, md: 12, base: 14, lg: 20, xl: 24, xxl: 32, huge: 48,
} as const;

export const GUTTER = 20;

export const radius = {
  sheet: 24, card: 18, chip: 12, pill: 999,
} as const;

export const CONTINUOUS = { borderCurve: "continuous" } as const;

export const lightShadow = {
  fab: { boxShadow: "0 6px 18px rgba(49, 87, 245, 0.34)" },
  card: { boxShadow: "0 2px 10px rgba(17, 22, 42, 0.05)" },
  sheet: { boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.12)" },
} as const;

export type AppShadow = {
  readonly [K in keyof typeof lightShadow]: { readonly boxShadow: string };
};

export const darkShadow: AppShadow = {
  fab: { boxShadow: "0 6px 22px rgba(49, 87, 245, 0.44)" },
  card: { boxShadow: "0 3px 16px rgba(0, 0, 0, 0.32)" },
  sheet: { boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.46)" },
};

export const DISPLAY_FONT = "PlusJakartaSans_800ExtraBold";
export const DISPLAY_FONT_BOLD = "PlusJakartaSans_700Bold";

function makeType(palette: AppColor) {
  return {
    eyebrow: {
      fontSize: 10, lineHeight: 14, fontWeight: "800",
      letterSpacing: 1.4, textTransform: "uppercase", color: palette.faint,
    },
    screenTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
    rowTitle: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
    rowTitleLg: { fontSize: 14, lineHeight: 19, fontWeight: "500" },
    rowSub: { fontSize: 11, lineHeight: 15, fontWeight: "400", color: palette.faint },
    body: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
    meta: { fontSize: 12, lineHeight: 16, fontWeight: "400", color: palette.faint },
    action: { fontSize: 11, lineHeight: 15, fontWeight: "700", color: palette.accent },
    statLabel: {
      fontSize: 10, lineHeight: 13, fontWeight: "600",
      letterSpacing: 0.5, textTransform: "uppercase", color: palette.faint,
    },
  } as const;
}

export const lightType = makeType(lightColor);
export const darkType: typeof lightType = makeType(darkColor);
export type AppType = typeof lightType;

export type AppearancePreference = "system" | "light" | "dark";
export type AppScheme = "light" | "dark";

export function resolveScheme(
  appearance: AppearancePreference,
  systemScheme: ColorSchemeName | null | undefined,
): AppScheme {
  return appearance === "system" ? (systemScheme === "dark" ? "dark" : "light") : appearance;
}

export const themes = {
  light: { color: lightColor, type: lightType, shadow: lightShadow, scheme: "light" },
  dark: { color: darkColor, type: darkType, shadow: darkShadow, scheme: "dark" },
} as const;

export type AppTheme = (typeof themes)[AppScheme];

export const TABULAR: { fontVariant: TextStyle["fontVariant"] } = {
  fontVariant: ["tabular-nums"],
};
