import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { color, space, radius, type, CONTINUOUS } from "@/theme/tokens";

/** Stands in for screens landing in later phases. Deleted as each is built. */
export function PlaceholderScreen({
  name,
  symbol,
  phase,
}: {
  name: string;
  symbol: string;
  phase: string;
}) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ padding: space.lg }}
    >
      <View
        style={{
          backgroundColor: color.card,
          borderRadius: radius.card,
          ...CONTINUOUS,
          padding: space.xl,
          alignItems: "center",
          gap: space.md,
        }}
      >
        <Image source={`sf:${symbol}`} tintColor={color.muted} style={{ width: 32, height: 32 }} />
        <Text style={{ ...type.heading, color: color.ink }}>{name}</Text>
        <Text style={{ ...type.caption, color: color.muted }}>Lands in {phase}</Text>
      </View>
    </ScrollView>
  );
}
