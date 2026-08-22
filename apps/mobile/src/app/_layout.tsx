import { Stack } from "expo-router/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SpaceProvider } from "@/state/space";
import { color } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync();

/** Shared options for every sheet route, so they present identically. */
const SHEET = {
  presentation: "formSheet",
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
  contentStyle: { backgroundColor: color.canvas },
} as const;

export default function RootLayout() {
  // Only the money face is loaded. Everything else is SF Pro, which is free.
  const [fontsReady] = useFonts({ Manrope_800ExtraBold });

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SpaceProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          {/*
            Sheets are routes, not components: native presentation, native
            detents, native dismiss gesture. No sheet library in the app.
          */}
          <Stack.Screen
            name="add-expense"
            options={{ ...SHEET, sheetAllowedDetents: [0.66, 0.95] }}
          />
          <Stack.Screen
            name="converter"
            options={{ ...SHEET, sheetAllowedDetents: [0.58] }}
          />
          <Stack.Screen
            name="budget-editor"
            options={{ ...SHEET, sheetAllowedDetents: [0.62] }}
          />
          <Stack.Screen
            name="recurring-rule"
            options={{ ...SHEET, sheetAllowedDetents: [0.8, 0.95] }}
          />
        </Stack>
      </SpaceProvider>
    </GestureHandlerRootView>
  );
}
