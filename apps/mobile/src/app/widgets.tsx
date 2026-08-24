import { Platform, ScrollView, Text, View } from "react-native";
import { Label, Rule, SectionCard } from "@/components/primitives";
import { color, CONTINUOUS, DISPLAY_FONT, GUTTER, radius, space, type } from "@/theme/tokens";

export default function WidgetsScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: space.huge }}
    >
      <Label>Available widget</Label>
      <View style={{ paddingHorizontal: GUTTER, paddingVertical: space.base }}>
        <View
          style={{
            ...CONTINUOUS,
            minHeight: 150,
            borderRadius: radius.card + 6,
            backgroundColor: color.chip,
            padding: space.lg,
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: space.xs }}>
            <Text style={{ ...type.eyebrow, color: color.accent }}>Monthly budget</Text>
            <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 24, color: color.ink }}>What&apos;s left</Text>
            <Text style={type.rowSub}>Spent, remaining and monthly progress at a glance.</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: color.border, overflow: "hidden" }}>
            <View style={{ width: "62%", height: "100%", backgroundColor: color.accent }} />
          </View>
        </View>
      </View>

      <Label>Add to Home Screen</Label>
      <SectionCard>
        <Step number="1" text="Touch and hold an empty area on your Home Screen." />
        <Rule full />
        <Step number="2" text="Tap Edit, then Add Widget." />
        <Rule full />
        <Step number="3" text="Search for Kobo Tracker and choose Budget Progress." />
      </SectionCard>

      <Label>Updates</Label>
      <SectionCard style={{ paddingHorizontal: GUTTER, paddingVertical: space.md }}>
          <Text style={{ ...type.body, color: color.body }}>
            The widget refreshes whenever you open Kobo Tracker or your monthly budget changes.
          </Text>
          {Platform.OS !== "ios" && (
            <Text style={{ ...type.rowSub, marginTop: space.sm }}>
              The Home Screen widget is currently available on iPhone.
            </Text>
          )}
      </SectionCard>
    </ScrollView>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: GUTTER, paddingVertical: space.md }}>
      <View
        style={{
          width: 28, height: 28, borderRadius: 14, backgroundColor: color.ink,
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "800", color: color.onAccent }}>{number}</Text>
      </View>
      <Text style={{ ...type.rowTitleLg, flex: 1, color: color.ink }}>{text}</Text>
    </View>
  );
}
