import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import type { AmountKey } from "@budget/shared";
import { color, space, radius, CONTINUOUS, DISPLAY_FONT } from "@/theme/tokens";

const KEYS: AmountKey[] = ["1","2","3","4","5","6","7","8","9",".","0","del"];

/**
 * Amounts never use the system keyboard: bigger targets, no layout jump when
 * it appears, and the currency stays visible next to the figure.
 */
export function Keypad({ onKey }: { onKey: (k: AmountKey) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          accessibilityRole="button"
          accessibilityLabel={k === "del" ? "Delete" : k}
          onPress={() => {
            Haptics.selectionAsync();
            onKey(k);
          }}
          style={({ pressed }) => ({
            width: "31.8%",
            paddingVertical: 13,
            borderRadius: radius.chip,
            ...CONTINUOUS,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? color.border : color.chip,
          })}
        >
          {k === "del" ? (
            <Image source="sf:delete.left" tintColor={color.faint} style={{ width: 20, height: 20 }} />
          ) : (
            <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 20, color: color.ink }}>{k}</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}
