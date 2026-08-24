import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "@/components/logo";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import {
  color, space, GUTTER, radius, shadow, type, CONTINUOUS, DISPLAY_FONT,
} from "@/theme/tokens";

const WELCOME_SEEN_KEY = "kobo.welcome.seen";

export default function WelcomeScreen() {
  const { show } = useLocalSearchParams<{ show?: string }>();
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (show === "1") {
      setReady(true);
      return;
    }
    SecureStore.getItemAsync(WELCOME_SEEN_KEY)
      .then((seen) => seen ? router.replace("/(auth)/sign-in") : setReady(true))
      .catch(() => setReady(true));
  }, [show]);

  async function continueTo(path: "/(auth)/sign-in" | "/(auth)/sign-up") {
    if (leaving) return;
    setLeaving(true);
    Haptics.selectionAsync();
    try {
      await SecureStore.setItemAsync(WELCOME_SEEN_KEY, "1");
    } finally {
      router.push(path);
    }
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.canvas }}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: space.md }}
        showsVerticalScrollIndicator={false}
      >
        <Brand markSize={38} wordSize={20} />

        <View style={{ marginTop: space.xl }}>
          <Text
            style={{
              fontFamily: DISPLAY_FONT, fontSize: 36, lineHeight: 40,
              letterSpacing: -1.2, color: color.ink,
            }}
          >
            See what is left before you spend it.
          </Text>
          <Text style={{ ...type.body, color: color.body, fontSize: 15, lineHeight: 22, marginTop: space.md }}>
            Plan income, bills, everyday spending and family money in one calm monthly view.
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", minHeight: 330, paddingVertical: space.xl }}>
          <View
            style={{
              position: "absolute", left: 12, right: -4, top: 32, bottom: 20,
              borderRadius: radius.card + 6, backgroundColor: color.brandLime,
              transform: [{ rotate: "2deg" }], ...CONTINUOUS,
            }}
          />
          <View
            accessible
            accessibilityLabel="Example monthly plan. Five hundred thousand naira income, two hundred thirty-five thousand five hundred naira for bills and goals, eighty thousand naira spent, and one hundred eighty-four thousand five hundred naira left to spend. On track."
            style={{
              backgroundColor: color.surfaceStrong, borderRadius: radius.card + 6,
              paddingHorizontal: space.lg, paddingVertical: space.xl,
              transform: [{ rotate: "-1.5deg" }], ...CONTINUOUS, ...shadow.sheet,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ ...type.eyebrow, color: "#FFFFFF99" }}>Example month</Text>
              <View style={{ backgroundColor: color.brandLime, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: color.surfaceStrong }}>ON TRACK</Text>
              </View>
            </View>

            <Text style={{ ...type.statLabel, color: "#FFFFFF99", marginTop: space.xl }}>Left to spend</Text>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={{ fontFamily: DISPLAY_FONT, fontSize: 38, letterSpacing: -1.4, color: color.onAccent, marginTop: 2 }}
            >
              ₦184,500
            </Text>

            <View style={{ height: 1, backgroundColor: "#FFFFFF20", marginVertical: space.lg }} />
            <ReceiptRow label="Income planned" value="₦500,000" />
            <ReceiptRow label="Bills & goals" value="−₦235,500" />
            <ReceiptRow label="Spent so far" value="−₦80,000" />
          </View>
        </View>

      </ScrollView>

      <View
        style={{
          gap: space.sm, paddingHorizontal: GUTTER, paddingTop: space.sm,
          backgroundColor: color.canvas,
        }}
      >
          <Pressable
            disabled={leaving}
            onPress={() => void continueTo("/(auth)/sign-up")}
            style={{
              minHeight: 52, borderRadius: radius.card, backgroundColor: color.accent,
              alignItems: "center", justifyContent: "center", ...CONTINUOUS, ...shadow.fab,
            }}
          >
            <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 15, color: color.onAccent }}>Start planning</Text>
          </Pressable>
          <Pressable
            disabled={leaving}
            onPress={() => void continueTo("/(auth)/sign-in")}
            style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ ...type.body, fontWeight: "700", color: color.ink }}>I already have an account</Text>
          </Pressable>
          <Text style={{ ...type.rowSub, textAlign: "center", color: color.faint }}>
            Private by default · No bank connection required
          </Text>
      </View>
    </SafeAreaView>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
      <Text style={{ ...type.body, color: "#FFFFFFA6" }}>{label}</Text>
      <Text style={{ ...type.body, fontWeight: "700", color: color.onAccent }}>{value}</Text>
    </View>
  );
}
