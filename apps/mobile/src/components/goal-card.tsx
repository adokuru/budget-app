import { Text, View } from "react-native";
import { Link } from "expo-router";
import { formatWhole } from "@budget/shared";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { GoalProgress } from "@/components/goal-progress";
import type { GoalSummary } from "@/hooks/use-goals";
import { useTheme } from "@/hooks/use-theme";
import { GUTTER, DISPLAY_FONT, space } from "@/theme/tokens";

export function GoalCard({ summary, compact = false }: { summary: GoalSummary; compact?: boolean }) {
  const { color, type } = useTheme();
  const { goal, totalMinor, percent, state } = summary;
  const due = goal.dueAt?.toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });
  const status = state === "completed" ? "Completed" : state === "overdue" ? "Overdue" : due ? `Due ${due}` : "No due date";

  return (
    <Link href={{ pathname: "/goal/[id]", params: { id: goal.id } } as never} asChild>
      <Pressable
        accessibilityLabel={`Open goal ${goal.name}, ${percent}% funded, ${status}`}
        style={{
          marginHorizontal: GUTTER,
          padding: compact ? space.base : space.lg,
          backgroundColor: color.brandLime,
          borderWidth: 1,
          borderColor: color.ink,
          gap: compact ? space.sm : space.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.md }}>
          <Text
            selectable
            numberOfLines={2}
            style={{
              flex: 1, fontFamily: DISPLAY_FONT, fontSize: compact ? 18 : 24,
              lineHeight: compact ? 22 : 28,
              color: color.onBrand,
            }}
          >
            {goal.name}
          </Text>
          <Text style={{ ...type.eyebrow, color: color.onBrand }}>
            {state}
          </Text>
        </View>
        <GoalProgress percent={percent} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
          <Text selectable style={{ ...type.rowSub, color: color.onBrand }}>
            {formatWhole(totalMinor, goal.currency)} tracked
          </Text>
          <Text selectable style={{ ...type.rowSub, color: color.onBrand }}>
            {status}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
