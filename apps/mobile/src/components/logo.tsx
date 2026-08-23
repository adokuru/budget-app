import { View } from "react-native";
import { Image } from "expo-image";
import { radius, CONTINUOUS, shadow } from "@/theme/tokens";

/** The app mark. Same artwork as the home-screen icon, so they read as one thing. */
export function Logo({ size = 64 }: { size?: number }) {
  return (
    <View
      style={{
        width: size, height: size,
        borderRadius: size * 0.28, ...CONTINUOUS,
        overflow: "hidden",
        ...shadow.lifted,
      }}
    >
      <Image
        source={require("../../assets/images/icon.png")}
        style={{ width: size, height: size }}
        contentFit="cover"
      />
    </View>
  );
}
