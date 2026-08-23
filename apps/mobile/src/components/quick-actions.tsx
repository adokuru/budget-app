import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { color, space, radius, type, CONTINUOUS } from "@/theme/tokens";

type Action = { label: string; symbol: string; href: string; accent?: boolean };

const ACTIONS: Action[] = [
  { label: "Add", symbol: "plus", href: "/add-expense", accent: true },
  { label: "Budget", symbol: "chart.pie.fill", href: "/budget-editor" },
  { label: "Recurring", symbol: "repeat", href: "/recurring-rule" },
  { label: "Convert", symbol: "arrow.left.arrow.right", href: "/converter" },
];

/** The four things you actually open the app to do, one tap from home. */
export function QuickActions() {
  return (
    <View style={{ flexDirection: "row", gap: space.sm }}>
      {ACTIONS.map((a) => (
        <Pressable
          key={a.label}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(a.href as never);
          }}
          style={{ flex: 1, alignItems: "center", gap: 6 }}
        >
          <View
            style={{
              width: "100%", height: 52,
              borderRadius: radius.row, ...CONTINUOUS,
              alignItems: "center", justifyContent: "center",
              backgroundColor: a.accent ? color.accent : color.card,
            }}
          >
            <Image
              source={`sf:${a.symbol}`}
              tintColor={a.accent ? color.onAccent : color.ink}
              style={{ width: 20, height: 20 }}
            />
          </View>
          <Text style={{ ...type.caption, color: color.muted }}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
