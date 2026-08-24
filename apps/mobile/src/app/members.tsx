import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, Share, Text, View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { spacesApi, type Member } from "@/lib/api";
import { sync } from "@/lib/sync";
import { useTheme } from "@/hooks/use-theme";
import { useSpace } from "@/state/space";
import { useAuth } from "@/state/auth";
import { space as sp, radius, CONTINUOUS, tint } from "@/theme/tokens";

export default function MembersSheet() {
  const { color, type } = useTheme();
  const { spaceId, space: current, canEdit } = useSpace();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setMembers(await spacesApi.members(spaceId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load members");
    }
  };

  useEffect(() => { void load(); }, [spaceId]);

  const me = members?.find((m) => m.id === user?.id);
  const isOwner = me?.role === "owner";

  async function invite() {
    setBusy(true);
    setError(null);
    try {
      const res = await spacesApi.invite(spaceId);
      setCode(res.code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create an invite");
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: Member) {
    // Destructive and not reversible from here, so it asks first.
    Alert.alert(
      `Remove ${member.name}?`,
      `They will lose access to ${current.name}. You can invite them again later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await spacesApi.removeMember(spaceId, member.id);
              await sync();
              await load();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not remove them");
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.canvas }}
      contentContainerStyle={{ padding: sp.lg, gap: sp.base, paddingBottom: sp.xxl }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ ...type.screenTitle, color: color.ink }}>{current.name}</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ ...type.body, color: color.faint }}>Done</Text>
        </Pressable>
      </View>

      {members === null ? <ActivityIndicator /> : (
        <View style={{ backgroundColor: color.surface, borderWidth: 1, borderColor: color.hairline, borderRadius: radius.card, overflow: "hidden", ...CONTINUOUS }}>
          {members.map((m, i) => (
            <View
              key={m.id}
              style={{
                flexDirection: "row", alignItems: "center", gap: sp.md, padding: sp.base,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: color.hairline,
              }}
            >
              <View
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: tint(color.accent, 0.15),
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ ...type.rowTitle, fontWeight: "700", color: color.accent }}>
                  {m.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ ...type.body, color: color.ink }}>
                  {m.name}{m.id === user?.id ? " (you)" : ""}
                </Text>
                <Text style={{ ...type.rowSub, color: color.faint, textTransform: "capitalize" }}>{m.role}</Text>
              </View>

              {isOwner && m.id !== user?.id && (
                <Pressable onPress={() => remove(m)} hitSlop={10}>
                  <Text style={{ ...type.rowTitle, color: color.danger }}>Remove</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {error && <Text selectable style={{ ...type.rowSub, color: color.danger }}>{error}</Text>}

      {canEdit && (code ? (
        <View
          style={{
            backgroundColor: color.surfaceStrong, borderRadius: radius.card, ...CONTINUOUS,
            padding: sp.lg, gap: sp.sm, alignItems: "center",
          }}
        >
          <Text style={{ ...type.eyebrow, color: "#FFFFFF99" }}>Invite code · expires in 7 days</Text>
          <Text selectable style={{ ...type.screenTitle, color: color.onStrong, letterSpacing: 6 }}>
            {code}
          </Text>
          <Pressable
            onPress={() =>
              Share.share({ message: `Use code ${code} to join ${current.name} on Kobo Tracker.` })
            }
            style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              paddingVertical: 10, paddingHorizontal: sp.lg,
              borderRadius: radius.pill, backgroundColor: color.accent, marginTop: sp.xs,
            }}
          >
            <Image source="sf:square.and.arrow.up" tintColor={color.onAccent}
                   style={{ width: 15, height: 15 }} />
            <Text style={{ ...type.rowTitle, fontWeight: "600", color: color.onAccent }}>Share</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={invite}
          disabled={busy}
          style={{
            height: 46, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
            backgroundColor: color.accent,
          }}
        >
          {busy ? <ActivityIndicator color={color.onAccent} /> : (
            <Text style={{ ...type.body, fontWeight: "600", color: color.onAccent }}>
              Invite someone
            </Text>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}
