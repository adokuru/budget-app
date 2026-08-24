import { Stack } from "expo-router/stack";

const TITLES: Record<string, string> = {
  index: "Home",
  budget: "Budget",
  recurring: "Recurring",
  settings: "Settings",
};

export const unstable_settings = {
  initialRouteName: "index",
  budget: { initialRouteName: "budget" },
  recurring: { initialRouteName: "recurring" },
  settings: { initialRouteName: "settings" },
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
        // The design draws its own wordmark header, so the native large
        // title would be a second, competing one.
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name={screen} options={{ title: TITLES[screen] ?? "" }} />
    </Stack>
  );
}
