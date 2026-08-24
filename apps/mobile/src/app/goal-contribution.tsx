import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { applyKey, formatWhole, goalTotal, toMinor, type AmountKey } from "@budget/shared";
import { database } from "@/db";
import type { Goal, GoalContribution } from "@/db/models";
import { currentUserId } from "@/lib/session";
import { syncQuietly } from "@/lib/sync";
import { useSpace } from "@/state/space";
import { Amt } from "@/components/amt";
import { Keypad } from "@/components/keypad";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useToast } from "@/components/toast";
import { useTheme } from "@/hooks/use-theme";
import { GUTTER, space } from "@/theme/tokens";

export default function GoalContributionSheet() {
  const { goalId: rawGoalId } = useLocalSearchParams<{ goalId: string | string[] }>();
  const goalId = Array.isArray(rawGoalId) ? rawGoalId[0] : rawGoalId;
  const { color, type } = useTheme();
  const { spaceId, canEdit } = useSpace();
  const { show } = useToast();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tracked, setTracked] = useState(0);
  const [raw, setRaw] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canEdit) return router.back();
    let cancelled = false;
    void Promise.all([
      database.get<Goal>("goals").find(goalId),
      database.get<GoalContribution>("goal_contributions").query().fetch(),
    ]).then(([found, contributions]) => {
      if (cancelled || found.spaceId !== spaceId) return router.back();
      setGoal(found);
      setTracked(goalTotal(contributions.filter((row) => row.goalId === goalId).map((row) => row.amountMinor)));
    }).catch(() => router.back());
    return () => { cancelled = true; };
  }, [goalId, spaceId, canEdit]);

  const minor = goal ? toMinor(raw || "0", goal.currency) : 0;
  const canSave = canEdit && goal !== null && minor > 0 && !saving;

  async function save() {
    if (!canSave || !goal) return;
    setSaving(true);
    try {
      await database.write(() => database.get<GoalContribution>("goal_contributions").create((row) => {
        row.spaceId = spaceId;
        row.goalId = goal.id;
        row.createdBy = currentUserId();
        row.amountMinor = minor;
        row.currency = goal.currency;
        row.contributedAt = new Date();
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      show("Contribution tracked", { tone: "success" });
      syncQuietly();
      router.back();
    } catch (error) {
      show(error instanceof Error ? error.message : "Could not track contribution", { tone: "error" });
      setSaving(false);
    }
  }

  if (!goal) return <View style={{ flex: 1, backgroundColor: color.canvas }} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.canvas }}
      contentContainerStyle={{ minHeight: "100%", paddingBottom: space.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: GUTTER }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={{ ...type.body, color: color.faint }}>Cancel</Text></Pressable>
        <Text style={{ ...type.body, fontWeight: "700", color: color.ink }}>Add money</Text>
        <Pressable accessibilityLabel="Save goal contribution" onPress={save} disabled={!canSave} hitSlop={12}>
          <Text style={{ ...type.body, fontWeight: "700", color: canSave ? color.accent : color.fainter }}>{saving ? "Saving" : "Save"}</Text>
        </Pressable>
      </View>

      <View style={{ backgroundColor: color.brandLime, paddingHorizontal: GUTTER, paddingVertical: space.lg, gap: space.xs }}>
        <Text selectable style={{ ...type.screenTitle, color: color.onBrand }}>{goal.name}</Text>
        <Text selectable style={{ ...type.rowSub, color: color.onBrand }}>
          {formatWhole(tracked, goal.currency)} tracked of {formatWhole(goal.targetMinor, goal.currency)}
        </Text>
      </View>

      <View style={{ alignItems: "center", paddingVertical: space.xxl }}>
        <Amt minor={minor} currency={goal.currency} size="xl" tone={minor > 0 ? color.ink : color.fainter} hideFraction={!raw.includes(".")} />
      </View>

      <View style={{ paddingHorizontal: GUTTER }}>
        <Keypad onKey={(key: AmountKey) => setRaw((value) => applyKey(value, key))} />
      </View>

      <Text selectable style={{ ...type.rowSub, lineHeight: 17, paddingHorizontal: GUTTER, paddingTop: space.base }}>
        This records progress only. No bank transfer is made and your monthly budget does not change.
      </Text>
    </ScrollView>
  );
}
