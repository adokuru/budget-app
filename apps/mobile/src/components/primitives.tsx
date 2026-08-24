import { Text, View, type ViewStyle } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useReducedMotion } from "@/lib/motion";
import { space, GUTTER, radius, CONTINUOUS } from "@/theme/tokens";
import { useTheme } from "@/hooks/use-theme";

const EASE_IN_OUT = cubicBezier(0.77, 0, 0.175, 1);

/**
 * A hairline rule inset from the gutter. The design uses these instead of
 * cards — the list is the structure.
 */
export function Rule({ full = false }: { full?: boolean }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: color.hairline,
        marginHorizontal: full ? 0 : GUTTER,
      }}
    />
  );
}

/** Section eyebrow: small, extrabold, wide-tracked, uppercase. */
export function Label({
  children,
  action,
}: {
  children: string;
  action?: React.ReactNode;
}) {
  const { type } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: GUTTER,
        paddingTop: space.lg,
        paddingBottom: space.sm,
      }}
    >
      <Text style={type.eyebrow}>{children}</Text>
      {action}
    </View>
  );
}

/**
 * The 3px progress hairline. Turns amber past 72% and red past 90%, so a
 * category that is about to break its budget says so before it does.
 */
export function Thin({
  spent,
  budget,
  tone,
  trackColor,
}: {
  spent: number;
  budget: number;
  tone: string;
  trackColor?: string;
}) {
  const reduced = useReducedMotion();
  const { color } = useTheme();
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const fill = pct > 90 ? color.danger : pct > 72 ? color.warning : tone;

  return (
    <View
      style={{
        height: 3,
        borderRadius: radius.pill,
        backgroundColor: trackColor ?? color.hairline,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          width: "100%",
          height: "100%",
          borderRadius: radius.pill,
          backgroundColor: fill,
          transformOrigin: "left",
          transform: [{ scaleX: pct / 100 }],
          ...(!reduced && {
            transitionProperty: "transform",
            transitionDuration: "220ms",
            transitionTimingFunction: EASE_IN_OUT,
          }),
        }}
      />
    </View>
  );
}

/** A restrained group surface; lists stay scannable without becoming card soup. */
export function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { color, shadow } = useTheme();
  return (
    <View
      style={[
        {
          marginHorizontal: GUTTER,
          backgroundColor: color.surface,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: color.hairline,
          overflow: "hidden",
          ...CONTINUOUS,
          ...shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** The emoji medallion used on transaction rows. */
export function Emoji({ glyph, size = 36 }: { glyph: string; size?: number }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color.chip,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.44 }}>{glyph}</Text>
    </View>
  );
}

/** Bare emoji in a fixed-width slot, as category rows use. */
export function EmojiPlain({ glyph }: { glyph: string }) {
  return (
    <Text style={{ fontSize: 18, width: 28, textAlign: "center" }}>{glyph}</Text>
  );
}

/** A full-bleed row with the design's standard gutter and rhythm. */
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          paddingHorizontal: GUTTER,
          paddingVertical: space.base,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Three figures divided by vertical hairlines. */
export function StatStrip({
  items,
  bordered = false,
}: {
  items: { label: string; value: React.ReactNode }[];
  bordered?: boolean;
}) {
  const { color, type } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: bordered ? 1 : 0,
        borderBottomWidth: bordered ? 1 : 0,
        borderColor: color.hairline,
      }}
    >
      {items.map((item, i) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: space.base + 2,
            gap: space.xs,
            borderLeftWidth: i === 0 ? 0 : 1,
            borderLeftColor: color.hairline,
          }}
        >
          <Text style={type.statLabel}>{item.label}</Text>
          {item.value}
        </View>
      ))}
    </View>
  );
}

/** Inline chip used for the invite code block and similar insets. */
export function SoftBlock({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { color } = useTheme();
  return (
    <View
      style={[
        {
          marginHorizontal: GUTTER,
          paddingHorizontal: space.base,
          paddingVertical: space.md,
          backgroundColor: color.pressed,
          borderRadius: radius.card,
          ...CONTINUOUS,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
