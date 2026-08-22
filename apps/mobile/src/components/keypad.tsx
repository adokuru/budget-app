import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { color, radius, space, spring, CONTINUOUS, MONEY_FONT } from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";

import type { AmountKey } from "@budget/shared";

const KEYS: AmountKey[] = ["1","2","3","4","5","6","7","8","9",".","0","del"];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function KeyButton({ value, onPress }: { value: AmountKey; onPress: (k: AmountKey) => void }) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={value === "del" ? "Delete" : value}
      onPressIn={() => {
        if (!reduced) scale.value = withSpring(0.94, spring.snappy);
        Haptics.selectionAsync();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, spring.snappy);
      }}
      onPress={() => onPress(value)}
      style={[
        style,
        {
          flex: 1,
          height: 58,
          borderRadius: radius.row,
          ...CONTINUOUS,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: color.card,
        },
      ]}
    >
      {value === "del" ? (
        <Image source="sf:delete.left.fill" tintColor={color.muted} style={{ width: 22, height: 22 }} />
      ) : (
        <Text style={{ fontFamily: MONEY_FONT, fontSize: 24, color: color.ink }}>{value}</Text>
      )}
    </AnimatedPressable>
  );
}

/**
 * Amounts never use the system keyboard. Bigger targets, no layout jump when
 * it appears, and the currency chip stays visible next to the number.
 */
export function Keypad({ onKey }: { onKey: (k: AmountKey) => void }) {
  return (
    <View style={{ gap: space.sm }}>
      {[0, 3, 6, 9].map((start) => (
        <View key={start} style={{ flexDirection: "row", gap: space.sm }}>
          {KEYS.slice(start, start + 3).map((k) => (
            <KeyButton key={k} value={k} onPress={onKey} />
          ))}
        </View>
      ))}
    </View>
  );
}
