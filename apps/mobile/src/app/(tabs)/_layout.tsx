import { NativeTabs } from "expo-router/unstable-native-tabs";
import { color } from "@/theme/tokens";

/**
 * Native tabs, tinted to the design's cobalt. Kept native so the bar gets the
 * system's own blur, minimise-on-scroll and accessibility behaviour rather
 * than a hand-rolled imitation.
 */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={color.accent}
      iconColor={color.fainter}
      backgroundColor={color.canvas}
      labelStyle={{ fontSize: 10, fontWeight: "700" }}
    >
      <NativeTabs.Trigger name="(index)">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(budget)">
        <NativeTabs.Trigger.Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <NativeTabs.Trigger.Label>Budget</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(recurring)">
        <NativeTabs.Trigger.Icon sf="arrow.trianglehead.2.clockwise.rotate.90" />
        <NativeTabs.Trigger.Label>Recurring</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(settings)">
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
