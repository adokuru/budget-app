import { Text, View } from "react-native";
import { Image } from "expo-image";
import { color, space, radius, type, CONTINUOUS } from "@/theme/tokens";

export function EmptyState({
  symbol, title, body,
}: { symbol: string; title: string; body: string }) {
  return (
    <View
      style={{
        backgroundColor: color.card,
        borderRadius: radius.card,
        ...CONTINUOUS,
        padding: space.xl,
        alignItems: "center",
        gap: space.sm,
      }}
    >
      <Image source={`sf:${symbol}`} tintColor={color.muted} style={{ width: 28, height: 28 }} />
      <Text style={{ ...type.heading, color: color.ink }}>{title}</Text>
      <Text style={{ ...type.caption, color: color.muted, textAlign: "center" }}>{body}</Text>
    </View>
  );
}
