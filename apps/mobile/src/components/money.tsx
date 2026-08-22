import { Text, View, type TextStyle } from "react-native";
import { formatParts, formatMoney, type Currency } from "@budget/shared";
import { MONEY_FONT, TABULAR, color } from "@/theme/tokens";

type Size = "display" | "figure" | "row";

const SIZES: Record<Size, { font: number; symbol: number; fraction: number }> = {
  display: { font: 40, symbol: 24, fraction: 20 },
  figure: { font: 24, symbol: 15, fraction: 13 },
  row: { font: 16, symbol: 11, fraction: 9 },
};

export type MoneyProps = {
  minor: number;
  currency: Currency;
  size?: Size;
  /** Overrides the default ink/danger colouring. */
  tone?: string;
  /** Show an explicit + for positive values (income rows). */
  signed?: boolean;
  /** Hide the raised decimals. Whole-naira amounts read cleaner without .00 */
  hideFraction?: boolean;
};

/**
 * The single money renderer. Integer part full size, decimals raised to
 * the cap line at ~0.5x — the treatment from all three design references.
 *
 * Everything that shows money goes through here. No toFixed() anywhere else,
 * so currency, grouping and rounding can never drift between screens.
 */
export function Money({
  minor,
  currency,
  size = "row",
  tone,
  signed = false,
  hideFraction = false,
}: MoneyProps) {
  const { sign, symbol, integer, fraction } = formatParts(minor, currency);
  const s = SIZES[size];
  const prefix = sign || (signed && minor > 0 ? "+" : "");
  const fg = tone ?? (minor < 0 ? color.danger : color.ink);

  const base: TextStyle = {
    fontFamily: MONEY_FONT,
    color: fg,
    ...TABULAR,
  };

  return (
    <View
      style={{ flexDirection: "row", alignItems: "flex-start" }}
      accessibilityLabel={`${prefix}${formatMoney(Math.abs(minor), currency)}`}
    >
      <Text style={[base, { fontSize: s.symbol, lineHeight: s.font * 0.62 }]}>
        {prefix}
        {symbol}
      </Text>
      <Text style={[base, { fontSize: s.font, lineHeight: s.font * 1.06 }]}>
        {integer}
      </Text>
      {!hideFraction && (
        <Text style={[base, { fontSize: s.fraction, lineHeight: s.font * 0.62 }]}>
          {fraction}
        </Text>
      )}
    </View>
  );
}
