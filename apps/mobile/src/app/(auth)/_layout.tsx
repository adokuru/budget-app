import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useReducedMotion } from "@/lib/motion";
import { color, type } from "@/theme/tokens";

const AUTH_SCREEN = {
  headerShown: true,
  title: "",
  headerBackVisible: false,
  headerShadowVisible: false,
  headerTintColor: color.ink,
  headerStyle: { backgroundColor: color.canvas },
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

export default function AuthLayout() {
  const reduced = useReducedMotion();
  return (
    <Stack screenOptions={{ headerShown: false, animation: reduced ? "fade" : "default" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-in" options={AUTH_SCREEN} />
      <Stack.Screen name="sign-up" options={AUTH_SCREEN} />
    </Stack>
  );
}
