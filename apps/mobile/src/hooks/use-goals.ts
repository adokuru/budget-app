import { useMemo } from "react";
import { Q } from "@nozbe/watermelondb";
import { goalPercent, goalState, goalTotal, type GoalState } from "@budget/shared";
import { database } from "@/db";
import type { Goal, GoalContribution } from "@/db/models";
import { useQueryState } from "@/db/hooks";

export type GoalSummary = {
  goal: Goal;
  contributions: GoalContribution[];
  totalMinor: number;
  percent: number;
  state: GoalState;
};

export function useGoals(spaceId: string): GoalSummary[] {
  return useGoalsState(spaceId).goals;
}

export function useGoalsState(spaceId: string): { goals: GoalSummary[]; loading: boolean } {
  const goalQuery = useQueryState<Goal>(
    () => database.get<Goal>("goals").query(
      Q.where("space_id", spaceId), Q.sortBy("due_at", Q.asc)
    ),
    [spaceId]
  );
  const contributionState = useQueryState<GoalContribution>(
    () => database.get<GoalContribution>("goal_contributions").query(
      Q.where("space_id", spaceId), Q.sortBy("contributed_at", Q.desc)
    ),
    [spaceId]
  );

  const summaries = useMemo(() => goalQuery.rows.map((goal) => {
    const rows = contributionState.rows.filter((row) => row.goalId === goal.id);
    const totalMinor = goalTotal(rows.map((row) => row.amountMinor));
    return {
      goal,
      contributions: rows,
      totalMinor,
      percent: goalPercent(totalMinor, goal.targetMinor),
      state: goalState(totalMinor, goal.targetMinor, goal.dueAt?.getTime() ?? null),
    };
  }).sort((a, b) => {
    const rank = { overdue: 0, active: 1, completed: 2 } as const;
    if (rank[a.state] !== rank[b.state]) return rank[a.state] - rank[b.state];
    return (a.goal.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER)
      - (b.goal.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
  }), [goalQuery.rows, contributionState.rows]);

  return { goals: summaries, loading: goalQuery.loading || contributionState.loading };
}
