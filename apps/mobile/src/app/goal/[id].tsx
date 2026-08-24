import { Alert, ScrollView, Text, View } from "react-native";
import { Q } from "@nozbe/watermelondb";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { formatWhole, goalPercent, goalState, goalTotal } from "@budget/shared";
import { database } from "@/db";
import type { Goal, GoalContribution, User } from "@/db/models";
import { useQueryState } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { GoalProgress } from "@/components/goal-progress";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { Rule, ScreenLoading } from "@/components/primitives";
import { useToast } from "@/components/toast";
import { useTheme } from "@/hooks/use-theme";
import { syncQuietly } from "@/lib/sync";
import { DISPLAY_FONT, GUTTER, space } from "@/theme/tokens";

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Array.isArray(id) ? id[0] : id;
  const { color, type } = useTheme();
  const { spaceId, canEdit } = useSpace();
  const { show } = useToast();
  const goalQuery = useQueryState<Goal>(
    () => database.get<Goal>("goals").query(Q.where("id", goalId), Q.where("space_id", spaceId), Q.take(1)),
    [goalId, spaceId]
  );
  const contributionQuery = useQueryState<GoalContribution>(
    () => database.get<GoalContribution>("goal_contributions").query(
      Q.where("goal_id", goalId), Q.sortBy("contributed_at", Q.desc)
    ),
    [goalId]
  );
  const userQuery = useQueryState<User>(() => database.get<User>("users").query(), []);
  const goal = goalQuery.rows[0];
  const contributions = contributionQuery.rows;
  const users = userQuery.rows;

  if (goalQuery.loading || contributionQuery.loading || userQuery.loading) {
    return <View style={{ flex: 1, backgroundColor: color.canvas }}><ScreenLoading label="Loading goal" /></View>;
  }
  if (!goal) return <View style={{ flex: 1, backgroundColor: color.canvas }} />;

  const total = goalTotal(contributions.map((row) => row.amountMinor));
  const percent = goalPercent(total, goal.targetMinor);
  const state = goalState(total, goal.targetMinor, goal.dueAt?.getTime() ?? null);
  const due = goal.dueAt?.toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  }) ?? "No due date";

  function deleteContribution(row: GoalContribution) {
    Alert.alert(
      "Remove contribution?",
      `${formatWhole(row.amountMinor, row.currency)} will be removed from this goal's tracked progress.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove", style: "destructive",
          onPress: () => void database.write(() => row.markAsDeleted()).then(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            show("Contribution removed", { tone: "success" });
            syncQuietly();
          }).catch(() => show("Could not remove contribution", { tone: "error" })),
        },
      ]
    );
  }

  function deleteGoal() {
    Alert.alert(
      "Delete goal?",
      "The goal and its contribution history will be removed. This does not change your spending or transactions.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete goal", style: "destructive",
          onPress: () => void database.write(async () => {
            for (const row of contributions) await row.markAsDeleted();
            await goal.markAsDeleted();
          }).then(() => {
            show("Goal deleted", { tone: "success" });
            syncQuietly();
            router.back();
          }).catch(() => show("Could not delete goal", { tone: "error" })),
        },
      ]
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: space.huge }}
    >
      <View style={{ backgroundColor: color.brandLime, paddingHorizontal: GUTTER, paddingVertical: space.xxl, gap: space.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
          <Text
            selectable
            style={{ flex: 1, fontFamily: DISPLAY_FONT, fontSize: 38, lineHeight: 42, letterSpacing: -1.4, color: color.onBrand }}
          >
            {goal.name}
          </Text>
          <Text style={{ ...type.eyebrow, color: state === "overdue" ? color.danger : color.onBrand }}>
            {state}
          </Text>
        </View>
        <View>
          <Text style={{ ...type.statLabel, color: color.onBrand }}>Tracked</Text>
          <Text selectable style={{ fontFamily: DISPLAY_FONT, fontSize: 32, color: color.onBrand }}>
            {formatWhole(total, goal.currency)}
          </Text>
          <Text selectable style={{ ...type.rowSub, color: color.onBrand }}>
            of {formatWhole(goal.targetMinor, goal.currency)}
          </Text>
        </View>
        <GoalProgress percent={percent} />
      </View>

      <View style={{ backgroundColor: color.surfaceStrong, paddingHorizontal: GUTTER, paddingVertical: space.lg, gap: space.base }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.lg }}>
          <Text style={{ ...type.meta, color: color.onStrong }}>Due date</Text>
          <Text selectable style={{ ...type.body, fontWeight: "700", color: color.onStrong }}>{due}</Text>
        </View>
        <Text selectable style={{ ...type.rowSub, color: "#FFFFFFB8", lineHeight: 17 }}>
          Progress tracking only. Kobo Tracker does not move money or change your monthly budget.
        </Text>
      </View>

      {canEdit && (
        <View style={{ flexDirection: "row", gap: space.sm, paddingHorizontal: GUTTER, paddingVertical: space.lg }}>
          <Pressable
            accessibilityLabel={`Add money to ${goal.name}`}
            onPress={() => router.push({ pathname: "/goal-contribution", params: { goalId } } as never)}
            style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: color.accent }}
          >
            <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 14, color: color.onAccent }}>Add money</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Edit goal ${goal.name}`}
            onPress={() => router.push({ pathname: "/goal-editor", params: { id: goalId } } as never)}
            style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.ink }}
          >
            <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 14, color: color.ink }}>Edit goal</Text>
          </Pressable>
        </View>
      )}

      <View style={{ paddingHorizontal: GUTTER, paddingTop: space.md, paddingBottom: space.sm }}>
        <Text style={type.eyebrow}>Contribution history</Text>
      </View>
      {contributions.length === 0 ? (
        <View style={{ marginHorizontal: GUTTER, padding: space.lg, borderWidth: 1, borderColor: color.hairline }}>
          <Text style={{ ...type.body, color: color.body }}>No money tracked yet.</Text>
        </View>
      ) : (
        <View style={{ marginHorizontal: GUTTER, borderWidth: 1, borderColor: color.ink }}>
          {contributions.map((row, index) => {
            const author = users.find((user) => user.id === row.createdBy)?.name ?? "A member";
            return (
              <View key={row.id}>
                <Pressable
                  disabled={!canEdit}
                  onPress={() => deleteContribution(row)}
                  accessibilityLabel={`${formatWhole(row.amountMinor, row.currency)} added by ${author} on ${row.contributedAt.toLocaleDateString()}${canEdit ? ", tap to remove" : ""}`}
                  style={{ flexDirection: "row", alignItems: "center", padding: space.base, gap: space.md }}
                >
                  <View style={{ flex: 1 }}>
                    <Text selectable style={{ ...type.rowTitle, color: color.ink }}>{author}</Text>
                    <Text selectable style={type.rowSub}>{row.contributedAt.toLocaleDateString()}</Text>
                  </View>
                  <Text selectable style={{ fontFamily: DISPLAY_FONT, fontSize: 15, color: color.ink }}>
                    +{formatWhole(row.amountMinor, row.currency)}
                  </Text>
                </Pressable>
                {index < contributions.length - 1 && <Rule full />}
              </View>
            );
          })}
        </View>
      )}

      {canEdit && (
        <Pressable onPress={deleteGoal} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: GUTTER, marginTop: space.lg }}>
          <Text style={{ ...type.body, fontWeight: "700", color: color.danger }}>Delete goal</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
