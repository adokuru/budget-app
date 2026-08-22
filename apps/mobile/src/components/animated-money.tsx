import { useEffect } from "react";
import { TextInput, View, type TextStyle } from "react-native";
import Animated, {
  useAnimatedProps, useSharedValue, withSpring, useDerivedValue,
} from "react-native-reanimated";
import { CURRENCIES, type Currency } from "@budget/shared";
import { MONEY_FONT, TABULAR, color, spring } from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedInput = Animated.createAnimatedComponent(TextInput);

/**
 * Group digits without Intl, which is not available inside a worklet.
 * Only ever called on the integer part of a money value.
 */
function group(n: number): string {
  "worklet";
  const s = String(Math.floor(Math.abs(n)));
  let out = "";
  let c = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    out = s[i] + out;
    c += 1;
    if (c % 3 === 0 && i > 0) out = `,${out}`;
  }
  return out;
}

/**
 * The hero balance. Springs from its previous value to the new one entirely on
 * the UI thread — no re-render per frame — so adding a transaction visibly
 * counts the balance down while the sheet dismisses.
 */
export function AnimatedMoney({
  minor,
  currency,
  size = 40,
  tone = color.ink,
}: {
  minor: number;
  currency: Currency;
  size?: number;
  tone?: string;
}) {
  const decimals = CURRENCIES[currency].decimals;
  const factor = 10 ** decimals;
  const reduced = useReducedMotion();

  const value = useSharedValue(minor);

  useEffect(() => {
    value.value = reduced ? minor : withSpring(minor, spring.gentle);
  }, [minor, reduced, value]);

  const major = useDerivedValue(() => value.value / factor);

  const integerProps = useAnimatedProps(() => ({
    text: group(major.value),
    defaultValue: group(major.value),
  }));

  const fractionProps = useAnimatedProps(() => {
    const abs = Math.abs(Math.round(value.value));
    const f = String(abs % factor);
    return {
      text: f.padStart(decimals, "0"),
      defaultValue: f.padStart(decimals, "0"),
    };
  });

  const base: TextStyle = { fontFamily: MONEY_FONT, color: tone, padding: 0, ...TABULAR };
  const common = { editable: false, underlineColorAndroid: "transparent" } as const;

  return (
    <View
      style={{ flexDirection: "row", alignItems: "flex-start" }}
      accessibilityLabel={`${CURRENCIES[currency].symbol}${(minor / factor).toFixed(decimals)}`}
    >
      <AnimatedInput
        {...common}
        style={[base, { fontSize: size * 0.6, lineHeight: size * 0.62 }]}
        value={minor < 0 ? `-${CURRENCIES[currency].symbol}` : CURRENCIES[currency].symbol}
      />
      <AnimatedInput
        {...common}
        animatedProps={integerProps}
        style={[base, { fontSize: size, lineHeight: size * 1.06 }]}
      />
      <AnimatedInput
        {...common}
        animatedProps={fractionProps}
        style={[base, { fontSize: size * 0.5, lineHeight: size * 0.62 }]}
      />
    </View>
  );
}
