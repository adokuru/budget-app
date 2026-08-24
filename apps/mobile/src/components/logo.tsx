import { Text, View } from "react-native";
import { Image } from "expo-image";
import { DISPLAY_FONT } from "@/theme/tokens";
import { useTheme } from "@/hooks/use-theme";

export function LogoMark({ size = 42 }: { size?: number }) {
  return (
    <Image
      source={require("../../assets/images/kobo-mark.png")}
      contentFit="contain"
      accessibilityLabel="Kobo Tracker"
      style={{ width: size, height: size }}
    />
  );
}

/** The wordmark. "Kobo" in ink, "Tracker" in green — as the design has it. */
export function Wordmark({ size = 28 }: { size?: number }) {
  const { color } = useTheme();
  return (
    <Text style={{ fontFamily: DISPLAY_FONT, fontSize: size, color: color.ink, letterSpacing: size * -0.02 }}>
      Kobo <Text style={{ color: color.accent }}>Tracker</Text>
    </Text>
  );
}

export function Brand({ markSize = 38, wordSize = 22 }: { markSize?: number; wordSize?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <LogoMark size={markSize} />
      <Wordmark size={wordSize} />
    </View>
  );
}
