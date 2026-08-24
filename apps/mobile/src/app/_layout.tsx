import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
import { TrackingBridge } from "@/components/tracking-bridge";
import { useReducedMotion } from "@/lib/motion";
import { ToastProvider } from "@/components/toast";
import { useTheme } from "@/hooks/use-theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Only the display face is loaded. Body text stays on the system face.
  const [fontsReady] = useFonts({ PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PrefsProvider>
          <ThemedApp />
        </PrefsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { color, scheme } = useTheme();
  const navigationTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: color.accent,
        background: color.canvas,
        card: color.canvas,
        text: color.ink,
        border: color.hairline,
        notification: color.danger,
      },
    };
  }, [color, scheme]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(color.canvas);
  }, [color.canvas]);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function Gate() {
  const { user, ready } = useAuth();
  const signedIn = Boolean(user);
  const reduced = useReducedMotion();
  const { color } = useTheme();

  const sheet = {
    presentation: "formSheet",
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
    contentStyle: { backgroundColor: color.canvas },
  } as const;

  const detailHeader = {
    headerShown: true,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    headerTintColor: color.ink,
    headerStyle: { backgroundColor: color.canvas },
    contentStyle: { backgroundColor: color.canvas },
  } as const;

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
      <Stack screenOptions={{
        headerShown: false,
        animation: reduced ? "fade" : "default",
        contentStyle: { backgroundColor: color.canvas },
      }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="currency"
            options={{
              ...detailHeader,
              title: "Currency",
            }}
          />
          <Stack.Screen
            name="reminders"
            options={{
              ...detailHeader,
              title: "Reminders",
            }}
          />
          <Stack.Screen
            name="widgets"
            options={{
              ...detailHeader,
              title: "Widgets",
            }}
          />
          {/*
            Sheets are routes, not components: native presentation, native
            detents, native dismiss gesture. No sheet library in the app.
          */}
          <Stack.Screen name="add-expense" options={{ ...sheet, sheetAllowedDetents: [0.66, 0.95], sheetInitialDetentIndex: "last" }} />
          <Stack.Screen name="converter" options={{ ...sheet, sheetAllowedDetents: [0.58] }} />
          <Stack.Screen name="budget-editor" options={{ ...sheet, sheetAllowedDetents: [0.62] }} />
          <Stack.Screen name="recurring-rule" options={{ ...sheet, sheetAllowedDetents: [0.8, 0.95] }} />
          <Stack.Screen name="spaces" options={{ ...sheet, sheetAllowedDetents: [0.6] }} />
          <Stack.Screen name="members" options={{ ...sheet, sheetAllowedDetents: [0.7] }} />
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
