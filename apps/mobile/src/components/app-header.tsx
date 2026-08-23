import { Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { color, space, GUTTER, radius, type, DISPLAY_FONT } from "@/theme/tokens";

/**
 * The wordmark, a space chip, and a bell. Sits above the native large-title
 * area on every tab so the brand is present without a second nav bar.
 */
export function AppHeader({
  spaceName,
  isShared,
}: {
  spaceName: string;
  isShared: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: GUTTER,
        paddingVertical: space.md,
      }}
    >
      <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 17, color: color.ink }}>
        Kobo<Text style={{ color: color.accent }}>Tracker</Text>
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/spaces");
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.xs,
            backgroundColor: color.chipAlt,
            borderRadius: radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 12 }}>{isShared ? "👨‍👩‍👧" : "👤"}</Text>
          <Text style={{ ...type.body, fontWeight: "600", color: color.ink }} numberOfLines={1}>
            {spaceName}
          </Text>
          <Image source="sf:chevron.down" tintColor={color.faint} style={{ width: 9, height: 9 }} />
        </Pressable>
      </View>
    </View>
  );
}
