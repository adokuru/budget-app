import { Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { Brand } from "@/components/logo";
import { space, GUTTER, radius } from "@/theme/tokens";
import { useTheme } from "@/hooks/use-theme";

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
  const { color, shadow, type } = useTheme();
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
      <Brand markSize={32} wordSize={17} />

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
            backgroundColor: color.surface,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: color.hairline,
            paddingHorizontal: 10,
            paddingVertical: 6,
            ...shadow.card,
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
