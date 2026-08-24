import { Text, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { DISPLAY_FONT, TABULAR } from "@/theme/tokens";

export function GoalProgress({ percent }: { percent: number }) {
  const { color } = useTheme();
  const clamped = Math.max(0, Math.min(percent, 100));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Goal ${percent}% funded`}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
    >
      <View
        style={{
          flex: 1, height: 22, borderWidth: 1, borderColor: color.ink,
          backgroundColor: color.canvas, overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${clamped}%`, height: "100%", overflow: "hidden",
            backgroundColor: color.brandLime, flexDirection: "row",
          }}
        >
          {Array.from({ length: 28 }, (_, index) => (
            <View
              key={index}
              style={{
                width: 4, height: 32, marginRight: 7, marginTop: -5,
                backgroundColor: color.ink, transform: [{ rotate: "22deg" }],
              }}
            />
          ))}
        </View>
      </View>
      <Text selectable style={{ fontFamily: DISPLAY_FONT, fontSize: 12, color: color.ink, ...TABULAR }}>
        {percent}%
      </Text>
    </View>
  );
}
