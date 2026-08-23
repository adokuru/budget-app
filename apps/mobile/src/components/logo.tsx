import { Text } from "react-native";
import { color, DISPLAY_FONT } from "@/theme/tokens";

/** The wordmark. "Kobo" in ink, "Tracker" in green — as the design has it. */
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <Text style={{ fontFamily: DISPLAY_FONT, fontSize: size, color: color.ink, letterSpacing: size * -0.02 }}>
      Kobo<Text style={{ color: color.accent }}>Tracker</Text>
    </Text>
  );
}
