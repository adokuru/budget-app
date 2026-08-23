import { Text, View } from "react-native";
import { color, type } from "@/theme/tokens";

export function SectionHeader({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "baseline",
        justifyContent: "space-between", marginBottom: -4,
      }}
    >
      <Text style={{ ...type.heading, color: color.ink }}>{title}</Text>
      {trailing ? <Text style={{ ...type.caption, color: color.faint }}>{trailing}</Text> : null}
    </View>
  );
}
