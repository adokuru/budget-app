import { Text, View } from "react-native";
import { radius, type } from "@/theme/tokens";

/** Small status pill — MAXED, On track, 3 left. */
export function Badge({
  label, background, tone,
}: { label: string; background: string; tone: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: background,
      }}
    >
      <Text style={{ ...type.nano, color: tone }}>{label}</Text>
    </View>
  );
}
