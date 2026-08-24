import { useEffect, useState } from "react";
import {
  ActivityIndicator, ScrollView, Text, TextInput, View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { CURRENCIES, CURRENCY_CODES, type Currency } from "@budget/shared";
import { spacesApi, type SpaceSummary } from "@/lib/api";
import { sync } from "@/lib/sync";
import { useSpace } from "@/state/space";
import { color, space as sp, radius, type, CONTINUOUS } from "@/theme/tokens";

export default function SpacesSheet() {
  const { spaceId, switchSpace } = useSpace();
  const [spaces, setSpaces] = useState<SpaceSummary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [code, setCode] = useState("");

  const load = async () => {
    try {
      setSpaces(await spacesApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your spaces");
    }
  };

  useEffect(() => { void load(); }, []);

  async function act(fn: () => Promise<SpaceSummary>) {
    setBusy(true);
    setError(null);
    try {
      const created = await fn();
      await sync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      switchSpace(created.id);
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : "That did not work");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.canvas }}
      contentContainerStyle={{ padding: sp.lg, gap: sp.base, paddingBottom: sp.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ ...type.screenTitle, color: color.ink }}>Spaces</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ ...type.body, color: color.faint }}>Done</Text>
        </Pressable>
      </View>

      {spaces === null ? (
        <ActivityIndicator />
      ) : (
        <View style={{ backgroundColor: color.surface, borderWidth: 1, borderColor: color.hairline, borderRadius: radius.card, overflow: "hidden", ...CONTINUOUS }}>
          {spaces.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => { Haptics.selectionAsync(); switchSpace(s.id); router.back(); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: sp.md, padding: sp.base,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.hairline,
              }}
            >
              <Image
                source={s.id === spaceId ? "sf:checkmark.circle.fill" : "sf:circle"}
                tintColor={s.id === spaceId ? color.accent : color.hairline}
                style={{ width: 20, height: 20 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.body, color: color.ink }}>{s.name}</Text>
                <Text style={{ ...type.rowSub, color: color.faint }}>
                  {s.baseCurrency} · {s.role}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {error && <Text selectable style={{ ...type.rowSub, color: color.danger }}>{error}</Text>}

      {mode === "list" && (
        <View style={{ flexDirection: "row", gap: sp.sm }}>
          <Secondary label="Create a space" onPress={() => setMode("create")} />
          <Secondary label="Join with a code" onPress={() => setMode("join")} />
        </View>
      )}

      {mode === "create" && (
        <View style={{ gap: sp.sm }}>
          <Text style={{ ...type.eyebrow, color: color.faint }}>New space</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Family"
            placeholderTextColor={color.hairline}
            style={inputStyle}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp.sm }}>
            {CURRENCY_CODES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCurrency(c)}
                style={{
                  height: 34, paddingHorizontal: sp.md, borderRadius: radius.pill,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor: c === currency ? color.ink : color.hairline,
                }}
              >
                <Text style={{ ...type.rowTitle, color: c === currency ? color.onAccent : color.ink }}>
                  {CURRENCIES[c].symbol} {c}
                </Text>
              </Pressable>
            ))}
          </View>
          <Primary
            label="Create"
            busy={busy}
            disabled={name.trim().length === 0}
            onPress={() => act(() => spacesApi.create(name.trim(), currency))}
          />
        </View>
      )}

      {mode === "join" && (
        <View style={{ gap: sp.sm }}>
          <Text style={{ ...type.eyebrow, color: color.faint }}>Invite code</Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            placeholderTextColor={color.hairline}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[inputStyle, { letterSpacing: 4, textAlign: "center", fontSize: 22 }]}
          />
          <Primary
            label="Join"
            busy={busy}
            disabled={code.length !== 6}
            onPress={() => act(() => spacesApi.join(code))}
          />
        </View>
      )}
    </ScrollView>
  );
}

const inputStyle = {
  ...type.body,
  color: color.ink,
  backgroundColor: color.surface,
  borderWidth: 1,
  borderColor: color.hairline,
  borderRadius: radius.chip,
  ...CONTINUOUS,
  paddingHorizontal: sp.base,
  paddingVertical: 14,
} as const;

function Primary({
  label, onPress, busy, disabled,
}: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  const off = Boolean(disabled) || Boolean(busy);
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={{
        height: 46, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
        backgroundColor: off ? color.hairline : color.accent,
      }}
    >
      {busy ? <ActivityIndicator color={color.onAccent} /> : (
        <Text style={{ ...type.body, fontWeight: "600", color: off ? color.faint : color.onAccent }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function Secondary({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1, height: 44, borderRadius: radius.pill,
        alignItems: "center", justifyContent: "center", backgroundColor: color.surface,
        borderWidth: 1, borderColor: color.hairline,
      }}
    >
      <Text style={{ ...type.rowTitle, color: color.ink, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
