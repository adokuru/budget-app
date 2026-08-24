import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useReducedMotion } from "@/lib/motion";
import { useTheme } from "@/hooks/use-theme";

export default function AuthLayout() {
  const reduced = useReducedMotion();
  const { color, type } = useTheme();
  const authScreen = {
    headerShown: true,
    title: "",
    headerBackVisible: false,
    headerShadowVisible: false,
    headerTintColor: color.ink,
    headerStyle: { backgroundColor: color.canvas },
    contentStyle: { backgroundColor: color.canvas },
    headerLeft: ({ canGoBack }: { canGoBack?: boolean }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={12}
        onPress={() => canGoBack
          ? router.back()
          : router.replace({ pathname: "/(auth)", params: { show: "1" } } as never)}
        style={{ minHeight: 44, flexDirection: "row", alignItems: "center" }}
      >
        <Text style={{ fontSize: 30, lineHeight: 32, color: color.ink }}>‹</Text>
        <Text style={{ ...type.body, fontWeight: "600", color: color.ink }}>Back</Text>
      </Pressable>
    ),
  } as const;

  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: reduced ? "fade" : "default",
      contentStyle: { backgroundColor: color.canvas },
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-in" options={authScreen} />
      <Stack.Screen name="sign-up" options={authScreen} />
    </Stack>
  );
}
