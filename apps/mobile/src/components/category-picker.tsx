import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { CATEGORY_COLORS } from "@budget/shared";
import type { Category } from "@/db/models";
import { color, space, radius, type, tint } from "@/theme/tokens";

/**
 * A wrapping grid, not a horizontal strip: every category is visible at once,
 * so nothing is hidden off-screen while you are picking one.
 */
export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: space.sm,
        paddingHorizontal: space.lg,
      }}
    >
      {categories.map((c) => {
        const base = CATEGORY_COLORS[c.colorKey];
        const active = c.id === selectedId;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(c.id);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              height: 36,
              paddingHorizontal: space.md,
              borderRadius: radius.pill,
              backgroundColor: active ? base : tint(base),
            }}
          >
            <Image
              source={`sf:${c.symbol}`}
              tintColor={active ? "#FFFFFF" : base}
              style={{ width: 15, height: 15 }}
            />
            <Text
              style={{ ...type.label, color: active ? "#FFFFFF" : color.ink }}
              numberOfLines={1}
            >
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
