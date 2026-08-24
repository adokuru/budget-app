import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { applyKey, toMajor, toMinor, type AmountKey } from "@budget/shared";
import { database } from "@/db";
import type { Goal } from "@/db/models";
import { useSpace } from "@/state/space";
import { currentUserId } from "@/lib/session";
import { syncQuietly } from "@/lib/sync";
import { Amt } from "@/components/amt";
import { Keypad } from "@/components/keypad";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useToast } from "@/components/toast";
import { useTheme } from "@/hooks/use-theme";
import { DISPLAY_FONT, GUTTER, space } from "@/theme/tokens";

export default function GoalEditorSheet() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const goalId = Array.isArray(id) ? id[0] : id;
  const { color, type } = useTheme();
  const { spaceId, baseCurrency, canEdit } = useSpace();
  const { show } = useToast();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("0");
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [showAndroidDate, setShowAndroidDate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canEdit) router.back();
  }, [canEdit]);

  useEffect(() => {
    if (!goalId) return;
    let cancelled = false;
    database.get<Goal>("goals").find(goalId).then((found) => {
      if (cancelled || found.spaceId !== spaceId) return router.back();
      setGoal(found);
      setName(found.name);
      setRaw(String(toMajor(found.targetMinor, found.currency)));
      setDueAt(found.dueAt);
    }).catch(() => router.back());
    return () => { cancelled = true; };
  }, [goalId, spaceId]);

  const currency = goal?.currency ?? baseCurrency;
  const targetMinor = toMinor(raw || "0", currency);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const validDue = dueAt === null || dueAt.getTime() >= today.getTime() || goal?.dueAt?.getTime() === dueAt.getTime();
  const canSave = canEdit && name.trim().length > 0 && name.trim().length <= 60
    && targetMinor > 0 && validDue && !saving && (!goalId || goal !== null);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await database.write(async () => {
        if (goal) {
          await goal.update((row) => {
            row.name = name.trim();
            row.targetMinor = targetMinor;
            row.dueAt = dueAt;
          });
        } else {
          await database.get<Goal>("goals").create((row) => {
            row.spaceId = spaceId;
            row.createdBy = currentUserId();
            row.name = name.trim();
            row.targetMinor = targetMinor;
            row.currency = baseCurrency;
            row.dueAt = dueAt;
          });
        }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      show(goal ? "Goal updated" : "Goal created", { tone: "success" });
      syncQuietly();
      router.back();
    } catch (error) {
      show(error instanceof Error ? error.message : "Could not save goal", { tone: "error" });
      setSaving(false);
    }
  }

  if (!canEdit || (goalId && !goal)) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: space.xxl, gap: space.base }}
      stickyHeaderIndices={[0]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: GUTTER, backgroundColor: color.canvas }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ ...type.body, color: color.faint }}>Cancel</Text></Pressable>
        <Text style={{ ...type.body, fontWeight: "700", color: color.ink }}>{goal ? "Edit goal" : "New goal"}</Text>
        <Pressable accessibilityLabel="Save goal" onPress={save} disabled={!canSave} hitSlop={12}>
          <Text style={{ ...type.body, fontWeight: "700", color: canSave ? color.accent : color.fainter }}>{saving ? "Saving" : "Save"}</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: GUTTER, gap: space.xs }}>
        <Text style={type.eyebrow}>Goal name</Text>
        <TextInput
          testID="goal-name"
          accessibilityLabel="Goal name"
          value={name}
          onChangeText={setName}
          maxLength={60}
          placeholder="School fees, emergency fund, a trip"
          placeholderTextColor={color.fainter}
          style={{ minHeight: 52, paddingHorizontal: space.base, borderWidth: 1, borderColor: color.ink, fontFamily: DISPLAY_FONT, fontSize: 17, color: color.ink }}
        />
      </View>

      <View style={{ alignItems: "center", backgroundColor: color.brandLime, paddingVertical: space.lg, gap: space.xs }}>
        <Text style={{ ...type.eyebrow, color: color.onBrand }}>Target</Text>
        <Amt minor={targetMinor} currency={currency} size="xl" tone={color.onBrand} hideFraction={!raw.includes(".")} />
      </View>

      <View style={{ paddingHorizontal: GUTTER, gap: space.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ ...type.rowTitle, color: color.ink }}>Due date</Text>
            <Text style={type.rowSub}>{dueAt ? dueAt.toLocaleDateString() : "Optional"}</Text>
          </View>
          {dueAt ? (
            <Pressable onPress={() => setDueAt(null)} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ ...type.action, color: color.danger }}>Remove</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => { setDueAt(new Date(today)); setShowAndroidDate(true); }} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={type.action}>Add date</Text>
            </Pressable>
          )}
        </View>
        {dueAt && (process.env.EXPO_OS === "ios" || showAndroidDate) && (
          <DateTimePicker
            value={dueAt}
            minimumDate={today}
            display={process.env.EXPO_OS === "ios" ? "inline" : "default"}
            onChange={(_, value) => {
              if (process.env.EXPO_OS !== "ios") setShowAndroidDate(false);
              if (value) setDueAt(value);
            }}
          />
        )}
      </View>

      {!validDue && <Text selectable style={{ ...type.body, color: color.danger, paddingHorizontal: GUTTER }}>Choose today or a future date.</Text>}

      <View style={{ paddingHorizontal: GUTTER }}>
        <Keypad onKey={(key: AmountKey) => setRaw((value) => applyKey(value, key))} />
      </View>

      <Text selectable style={{ ...type.rowSub, lineHeight: 17, paddingHorizontal: GUTTER }}>
        Goals track progress only. Kobo Tracker does not move money or change your monthly budget.
      </Text>
    </ScrollView>
  );
}
