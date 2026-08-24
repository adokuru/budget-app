import { Text, View, type TextStyle } from "react-native";
import { formatParts, formatMoney, type Currency } from "@budget/shared";
import { DISPLAY_FONT, TABULAR } from "@/theme/tokens";
import { useTheme } from "@/hooks/use-theme";

export type AmtSize = "sm" | "md" | "lg" | "xl";

/**
 * Raised-decimal money, straight from the design: the naira figure at full
 * size with the kobo lifted to the cap line at roughly 0.4x.
 *
 * Everything that shows money goes through here, so grouping, rounding and
 * the currency symbol can never drift between screens.
 */
const SIZES: Record<AmtSize, { font: number; sup: number }> = {
  sm: { font: 15, sup: 0.52 },
  md: { font: 20, sup: 0.48 },
  lg: { font: 32, sup: 0.42 },
  xl: { font: 44, sup: 0.38 },
};

export function Amt({
  minor,
  currency,
  size = "md",
  tone,
  signed = false,
  hideFraction = false,
}: {
  minor: number;
  currency: Currency;
  size?: AmtSize;
  tone?: string;
  /** Render an explicit + for positive values, as income rows do. */
  signed?: boolean;
  hideFraction?: boolean;
}) {
  const { color } = useTheme();
  const { sign, symbol, integer, fraction } = formatParts(minor, currency);
  const s = SIZES[size];
  const fg = tone ?? color.ink;
  const prefix = sign ? "−" : signed && minor > 0 ? "+" : "";

  const base: TextStyle = {
    fontFamily: DISPLAY_FONT,
    color: fg,
    letterSpacing: s.font * -0.015,
    ...TABULAR,
  };

  return (
    <View
      style={{ flexDirection: "row", alignItems: "flex-start" }}
      accessibilityLabel={`${prefix}${formatMoney(Math.abs(minor), currency)}`}
    >
      <Text style={[base, { fontSize: s.font, lineHeight: s.font * 1.04 }]}>
        {prefix}
        {symbol}
        {integer}
      </Text>
      {!hideFraction && (
        <Text
          style={[
            base,
            {
              fontSize: s.font * s.sup,
              // Lifts the kobo to the cap line rather than the baseline.
              lineHeight: s.font * 0.62,
              letterSpacing: 0,
            },
          ]}
        >
          {fraction}
        </Text>
      )}
    </View>
  );
}

/** Compact form the design uses in dense columns: ₦122k. */
export function AmtShort({
  minor,
  currency,
  tone,
  size = 13,
}: {
  minor: number;
  currency: Currency;
  tone?: string;
  size?: number;
}) {
  const { color } = useTheme();
  const { symbol } = formatParts(minor, currency);
  const major = Math.abs(minor) / 100;
  const label =
    major >= 1_000_000
      ? `${(major / 1_000_000).toFixed(major >= 10_000_000 ? 0 : 1)}m`
      : major >= 1000
        ? `${Math.round(major / 1000)}k`
        : String(Math.round(major));

  return (
    <Text
      style={{
        fontFamily: DISPLAY_FONT,
        fontSize: size,
        color: tone ?? color.ink,
        letterSpacing: size * -0.02,
        ...TABULAR,
      }}
    >
      {minor < 0 ? "−" : ""}
      {symbol}
      {label}
    </Text>
  );
}
