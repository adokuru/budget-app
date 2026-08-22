import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useFonts, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Only the money face is loaded. Everything else is SF Pro, which is free.
  const [ready] = useFonts({ Manrope_800ExtraBold });

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(index)">
        <NativeTabs.Trigger.Icon sf="house.fill" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(budget)">
        <NativeTabs.Trigger.Icon sf="chart.pie.fill" />
        <NativeTabs.Trigger.Label>Budget</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(recurring)">
        <NativeTabs.Trigger.Icon sf="repeat" />
        <NativeTabs.Trigger.Label>Recurring</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(settings)">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
