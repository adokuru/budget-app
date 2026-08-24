import { Text } from "react-native";
import { Link } from "expo-router";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { PressableScale } from "@/components/pressable-scale";
import { useReducedMotion } from "@/lib/motion";
import { space, radius } from "@/theme/tokens";
import { useTheme } from "@/hooks/use-theme";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EMPTY_ENTER = FadeInDown.duration(220).easing(EASE_OUT);
const EMPTY_FADE = FadeIn.duration(150).easing(EASE_OUT);

export function EmptyState({
  symbol, title, body, action,
}: {
  /** Emoji, to match the rest of the design's iconography. */
  symbol?: string;
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  const reduced = useReducedMotion();
  const { color, type } = useTheme();

  return (
    <Animated.View
      entering={reduced ? EMPTY_FADE : EMPTY_ENTER}
      style={{ alignItems: "center", paddingVertical: space.xxl, gap: space.sm }}
    >
      {symbol && <Text style={{ fontSize: 30, marginBottom: space.xs }}>{symbol}</Text>}
      <Text style={{ ...type.screenTitle, color: color.ink }}>{title}</Text>
      <Text style={{ ...type.meta, textAlign: "center", lineHeight: 18, maxWidth: 280 }}>
        {body}
      </Text>
      {action && (
        <Link href={action.href as never} asChild>
          <PressableScale
            style={{
              marginTop: space.md, paddingVertical: 10, paddingHorizontal: space.lg,
              borderRadius: radius.pill, backgroundColor: color.accent,
            }}
          >
            <Text style={{ ...type.body, fontWeight: "700", color: color.onAccent }}>
              {action.label}
            </Text>
          </PressableScale>
        </Link>
      )}
    </Animated.View>
  );
}
