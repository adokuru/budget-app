import { darkColor, lightColor, resolveScheme } from "./tokens.ts";

const cases = [
  ["system", "dark", "dark"],
  ["system", "light", "light"],
  ["system", null, "light"],
  ["light", "dark", "light"],
  ["dark", "light", "dark"],
] as const;

for (const [appearance, system, expected] of cases) {
  if (resolveScheme(appearance, system) !== expected) {
    throw new Error(`Expected ${appearance}/${system} to resolve to ${expected}`);
  }
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

for (const palette of [lightColor, darkColor]) {
  const textPairs = [
    [palette.ink, palette.canvas],
    [palette.body, palette.canvas],
    [palette.faint, palette.canvas],
    [palette.onStrong, palette.surfaceStrong],
    [palette.onAccent, palette.accent],
    [palette.onPositive, palette.positive],
    [palette.onBrand, palette.brandLime],
    [palette.danger, palette.canvas],
    [palette.warning, palette.canvas],
  ] as const;
  for (const [foreground, background] of textPairs) {
    if (contrast(foreground, background) < 4.5) {
      throw new Error(`Insufficient theme contrast: ${foreground} on ${background}`);
    }
  }
}
