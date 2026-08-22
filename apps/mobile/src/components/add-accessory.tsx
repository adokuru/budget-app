import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { color, space, radius, type, spring } from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Lives in the iOS 26 tab-bar bottom accessory — the same slot Apple Music
 * uses for its mini player. A floating FAB overlapped the native tab bar;
 * this sits above it properly and is reachable from every tab.
 */
export function AddAccessory() {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: space.md }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        onPressIn={() => {
          if (!reduced) scale.value = withSpring(0.97, spring.snappy);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => { scale.value = withSpring(1, spring.snappy); }}
        onPress={() => router.push("/add-expense")}
        style={[
          style,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: space.sm,
            height: 44,
            borderRadius: radius.pill,
            backgroundColor: color.accent,
          },
        ]}
      >
        <Image source="sf:plus" tintColor={color.onAccent} style={{ width: 17, height: 17 }} />
        <Text style={{ ...type.body, fontWeight: "600", color: color.onAccent }}>
          Add expense
        </Text>
      </AnimatedPressable>
    </View>
  );
}
