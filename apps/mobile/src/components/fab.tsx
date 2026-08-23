import { View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale } from "@/components/pressable-scale";
import { color, shadow } from "@/theme/tokens";

/**
 * The add button, as the design places it: a small green disc floating clear
 * of the tab bar. Sits above the native bar rather than inside it, because
 * NativeTabs has no custom slot.
 */
export function Fab() {
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", right: 20, bottom: 108, zIndex: 20 }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Add entry"
        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        onPress={() => router.push("/add-expense")}
        style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: color.accent,
            alignItems: "center", justifyContent: "center",
            ...shadow.fab,
        }}
      >
        <Image source="sf:plus" tintColor={color.onAccent} style={{ width: 21, height: 21 }} />
      </PressableScale>
    </View>
  );
}
