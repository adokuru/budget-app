import { View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale } from "@/components/pressable-scale";
import { useTheme } from "@/hooks/use-theme";
import { useSpace } from "@/state/space";
import { radius } from "@/theme/tokens";

const FAB_SIZE = 52;
const FAB_BOTTOM = 108;
export const FAB_CONTENT_PADDING_BOTTOM = FAB_BOTTOM + FAB_SIZE + 16;

/**
 * The add button, as the design places it: a compact lime block floating clear
 * of the tab bar. Sits above the native bar rather than inside it, because
 * NativeTabs has no custom slot.
 */
export function Fab() {
  const { color, shadow } = useTheme();
  const { canEdit } = useSpace();
  if (!canEdit) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", right: 20, bottom: FAB_BOTTOM, zIndex: 20 }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Add entry"
        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        onPress={() => router.push("/add-expense")}
        style={{
            width: FAB_SIZE, height: FAB_SIZE, borderRadius: radius.card,
            backgroundColor: color.brandLime,
            borderWidth: 1, borderColor: color.ink,
            alignItems: "center", justifyContent: "center",
            ...shadow.fab,
        }}
      >
        <Image source="sf:plus" tintColor={color.onBrand} style={{ width: 22, height: 22 }} />
      </PressableScale>
    </View>
  );
}
