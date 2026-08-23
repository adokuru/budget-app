import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/state/auth";
import { SpaceProvider } from "@/state/space";
import { PrefsProvider } from "@/state/prefs";
import { syncQuietly } from "@/lib/sync";
import { color } from "@/theme/tokens";
import { TrackingBridge } from "@/components/tracking-bridge";

SplashScreen.preventAutoHideAsync();

/** Shared options for every sheet route, so they present identically. */
const SHEET = {
  presentation: "formSheet",
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
  contentStyle: { backgroundColor: color.canvas },
} as const;

export default function RootLayout() {
  // Only the display face is loaded. Body text stays on the system face.
  const [fontsReady] = useFonts({ PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PrefsProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </PrefsProvider>
    </GestureHandlerRootView>
  );
}

function Gate() {
  const { user, ready } = useAuth();
  const signedIn = Boolean(user);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Sync on foreground, so a change made on another device shows up when you
  // come back rather than only on a cold start.
  useEffect(() => {
    if (!signedIn) return;
    syncQuietly();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") syncQuietly();
    });
    return () => sub.remove();
  }, [signedIn]);

  if (!ready) return null;

  /*
    Stack.Protected, not a redirect effect. An effect runs after the first
    render, so the tab screens would mount once while signed out and call
    useSpace before the redirect landed.
  */
  return (
    <Body signedIn={signedIn}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="currency"
            options={{
              headerShown: true,
              title: "Currency",
              headerShadowVisible: false,
              headerBackButtonDisplayMode: "minimal",
              headerTintColor: color.ink,
              headerStyle: { backgroundColor: color.canvas },
            }}
          />
          <Stack.Screen
            name="reminders"
            options={{
              headerShown: true,
              title: "Reminders",
              headerShadowVisible: false,
              headerBackButtonDisplayMode: "minimal",
              headerTintColor: color.ink,
              headerStyle: { backgroundColor: color.canvas },
            }}
          />
          <Stack.Screen
            name="widgets"
            options={{
              headerShown: true,
              title: "Widgets",
              headerShadowVisible: false,
              headerBackButtonDisplayMode: "minimal",
              headerTintColor: color.ink,
              headerStyle: { backgroundColor: color.canvas },
            }}
          />
          {/*
            Sheets are routes, not components: native presentation, native
            detents, native dismiss gesture. No sheet library in the app.
          */}
          <Stack.Screen name="add-expense" options={{ ...SHEET, sheetAllowedDetents: [0.66, 0.95], sheetInitialDetentIndex: "last" }} />
          <Stack.Screen name="converter" options={{ ...SHEET, sheetAllowedDetents: [0.58] }} />
          <Stack.Screen name="budget-editor" options={{ ...SHEET, sheetAllowedDetents: [0.62] }} />
          <Stack.Screen name="recurring-rule" options={{ ...SHEET, sheetAllowedDetents: [0.8, 0.95] }} />
          <Stack.Screen name="spaces" options={{ ...SHEET, sheetAllowedDetents: [0.6] }} />
          <Stack.Screen name="members" options={{ ...SHEET, sheetAllowedDetents: [0.7] }} />
        </Stack.Protected>
      </Stack>
    </Body>
  );
}

/** The space context needs a signed-in user; the auth screens must not have it. */
function Body({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  return signedIn ? (
    <SpaceProvider>
      <TrackingBridge />
      {children}
    </SpaceProvider>
  ) : <>{children}</>;
}
