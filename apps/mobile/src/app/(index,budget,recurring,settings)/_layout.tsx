import { Stack } from "expo-router/stack";
import { PlatformColor } from "react-native";

const TITLES: Record<string, string> = {
  index: "Home",
  budget: "Budget",
  recurring: "Recurring",
  settings: "Settings",
};

/**
 * One shared stack, instantiated once per tab. Every tab can therefore push
 * any screen in this group (a transaction, a category) without duplicating
 * the route in four places.
 */
export default function TabStackLayout({ segment }: { segment: string }) {
  const screen = segment.match(/\((.*)\)/)?.[1] ?? "index";

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerTitleStyle: { color: PlatformColor("label") },
        headerBlurEffect: "none",
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name={screen} options={{ title: TITLES[screen] ?? "" }} />
    </Stack>
  );
}
