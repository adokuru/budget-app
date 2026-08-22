import { NativeTabs } from "expo-router/unstable-native-tabs";
import { AddAccessory } from "@/components/add-accessory";

export default function TabsLayout() {
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

      <NativeTabs.BottomAccessory>
        <AddAccessory />
      </NativeTabs.BottomAccessory>
    </NativeTabs>
  );
}
