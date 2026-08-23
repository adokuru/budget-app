import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { FALLBACK_EMOJI } from "@budget/shared";
import type { Category } from "@/db/models";
import { color, space, GUTTER, radius, type } from "@/theme/tokens";

/**
 * A single horizontal row of emoji chips, keeping the keypad in place.
 */
export function CategoryPicker({
  categories, selectedId, onSelect,
}: {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{ height: 34 }}>
      <ScrollView
        horizontal
        contentInsetAdjustmentBehavior="never"
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: space.sm, paddingHorizontal: GUTTER }}
      >
        {categories.map((c) => {
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
                flexDirection: "row", alignItems: "center", gap: 6,
                height: 34, paddingHorizontal: space.md,
                borderRadius: radius.pill,
                backgroundColor: active ? color.ink : color.chip,
              }}
            >
              <Text style={{ fontSize: 14 }}>{c.emoji || FALLBACK_EMOJI}</Text>
              <Text
                style={{ ...type.rowTitle, color: active ? color.onAccent : color.body }}
                numberOfLines={1}
              >
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
