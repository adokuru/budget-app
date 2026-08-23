import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { color, shadow, spring } from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The add button, as the design places it: a small green disc floating clear
 * of the tab bar. Sits above the native bar rather than inside it, because
 * NativeTabs has no custom slot.
 */
export function Fab() {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", right: 20, bottom: 108, zIndex: 20 }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Add entry"
        onPressIn={() => {
          if (!reduced) scale.value = withSpring(0.94, spring.snappy);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => { scale.value = withSpring(1, spring.snappy); }}
        onPress={() => router.push("/add-expense")}
        style={[
          style,
          {
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: color.accent,
            alignItems: "center", justifyContent: "center",
            ...shadow.fab,
          },
        ]}
      >
        <Image source="sf:plus" tintColor={color.onAccent} style={{ width: 21, height: 21 }} />
      </AnimatedPressable>
    </View>
  );
}
