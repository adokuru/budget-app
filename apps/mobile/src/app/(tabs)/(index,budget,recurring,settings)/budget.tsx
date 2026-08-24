import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Q } from "@nozbe/watermelondb";
import { sumMinor, convertMinor, percentOf, formatWhole, FALLBACK_EMOJI } from "@budget/shared";
import { database } from "@/db";
import type { Budget, Category, Transaction } from "@/db/models";
import { useQueryState } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { Amt, AmtShort } from "@/components/amt";
import { AppHeader } from "@/components/app-header";
import { Rule, Label, Thin, EmojiPlain, Row, ScreenLoading, SectionCard } from "@/components/primitives";
import { EmptyState } from "@/components/empty-state";
import { Fab, FAB_CONTENT_PADDING_BOTTOM } from "@/components/fab";
import { GoalCard } from "@/components/goal-card";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useTheme } from "@/hooks/use-theme";
import { useGoalsState } from "@/hooks/use-goals";
import { monthStart } from "@/lib/period";
import { space, CATEGORY_COLORS, DISPLAY_FONT, GUTTER } from "@/theme/tokens";

export default function BudgetScreen() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const showingGoals = view === "goals";
  const { color, type } = useTheme();
  const { spaceId, baseCurrency, displayCurrency, rates, space: current, isShared, canEdit } = useSpace();
  const since = useMemo(() => monthStart().getTime(), []);

  const txnState = useQueryState<Transaction>(
    () =>
      database.get<Transaction>("transactions").query(
        Q.where("space_id", spaceId), Q.where("kind", "expense"),
        Q.where("occurred_at", Q.gte(since))
      ),
    [spaceId, since]
  );
  const categoryState = useQueryState<Category>(
    () => database.get<Category>("categories")
      .query(Q.where("space_id", spaceId), Q.sortBy("sort", Q.asc)),
    [spaceId]
  );
  const budgetState = useQueryState<Budget>(
    () => database.get<Budget>("budgets")
      .query(Q.where("space_id", spaceId), Q.where("period_start", since)),
    [spaceId, since]
  );

  const txns = txnState.rows;
  const categories = categoryState.rows;
  const budgets = budgetState.rows;
  const loading = txnState.loading || categoryState.loading || budgetState.loading;

  const toDisplay = (m: number) =>
    baseCurrency === displayCurrency ? m : convertMinor(m, baseCurrency, displayCurrency, rates);

  const spentBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.baseMinor);
    return m;
  }, [txns]);

  const totalSpent = sumMinor([...spentBy.values()]);
  const budgeted = sumMinor(budgets.map((b) => b.amountMinor));
  const remaining = budgeted - totalSpent;
  const used = percentOf(totalSpent, budgeted);

  // Only categories that have a limit or some spend are worth a row.
  const rows = categories
    .filter((c) => c.kind === "expense")
    .map((c) => ({
      category: c,
      spent: spentBy.get(c.id) ?? 0,
      limit: budgets.find((b) => b.categoryId === c.id)?.amountMinor ?? 0,
    }))
    .filter((r) => r.limit > 0 || r.spent > 0);

  return (
    <>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: FAB_CONTENT_PADDING_BOTTOM }}
    >
      <AppHeader spaceName={current.name} isShared={isShared} />

      <BudgetMode goals={showingGoals} />

      {loading ? <ScreenLoading label="Loading budget" /> : showingGoals ? <GoalsView /> : <>

      <View style={{ marginHorizontal: GUTTER, marginTop: space.sm, padding: space.lg, backgroundColor: color.accent }}>
        <Text style={{ ...type.eyebrow, color: color.onAccent, marginBottom: space.sm }}>
          {monthLabel()} budget
        </Text>
        <Amt minor={toDisplay(budgeted)} currency={displayCurrency} size="xl" tone={color.onAccent} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg, marginTop: space.base }}>
          <Figure inverse label="Spent" value={<AmtShort minor={toDisplay(totalSpent)} currency={displayCurrency} size={15} tone={color.onAccent} />} />
          <Divider inverse />
          <Figure
            inverse
            label="Remaining"
            value={
              <AmtShort
                minor={toDisplay(remaining)}
                currency={displayCurrency}
                size={15}
                tone={remaining < 0 ? color.danger : color.brandLime}
              />
            }
          />
          <Divider inverse />
          <Figure
            inverse
            label="Used"
            value={
              <Text style={{ fontSize: 15, fontWeight: "800", color: color.onAccent }}>
                {used === null ? "—" : `${used}%`}
              </Text>
            }
          />
        </View>
        <CategoryDistribution rows={rows} total={totalSpent} />
      </View>

      {rows.length === 0 ? (
        <SectionCard style={{ marginTop: space.lg }}>
          <EmptyState
            symbol="🎯"
            title="No budgets set"
            body="Set a monthly spending limit for a category, such as ₦200,000 for food. Kobo Tracker will show what you have left."
            action={canEdit ? { label: "Set a budget", href: "/budget-editor" } : undefined}
          />
        </SectionCard>
      ) : (
        <>
          <Label
            action={canEdit ? (
              <Link href="/budget-editor" asChild>
                <Pressable hitSlop={10}>
                  <Text style={type.action}>Edit</Text>
                </Pressable>
              </Link>
            ) : undefined}
          >
            Categories
          </Label>

          <SectionCard>
            {rows.map(({ category, spent, limit }, i) => {
              const pct = percentOf(spent, limit);
              const over = limit > 0 && spent > limit;
              return (
                <View key={category.id}>
                  <Row style={{ paddingVertical: space.base + 2 }}>
                    <EmojiPlain glyph={category.emoji || FALLBACK_EMOJI} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View
                        style={{
                          flexDirection: "row", alignItems: "baseline",
                          justifyContent: "space-between", marginBottom: space.sm,
                        }}
                      >
                        <Text style={{ ...type.rowTitle, color: color.ink }} numberOfLines={1}>
                          {category.name}
                        </Text>
                        <Text style={type.rowSub}>
                          {formatWhole(toDisplay(spent), displayCurrency)}
                          {limit > 0 ? ` / ${formatWhole(toDisplay(limit), displayCurrency)}` : ""}
                        </Text>
                      </View>
                      <Thin spent={spent} budget={limit || spent} tone={CATEGORY_COLORS[category.colorKey]} />
                    </View>
                    <Text
                      style={{
                        fontSize: 11, fontWeight: "700", width: 52, textAlign: "right",
                        color: spent === 0 ? color.fainter : over ? color.danger : color.positive,
                      }}
                    >
                      {spent === 0 ? "—" : over ? "over" : pct === null ? "—" : `${pct}%`}
                    </Text>
                  </Row>
                  {i < rows.length - 1 && <Rule full />}
                </View>
              );
            })}
          </SectionCard>
        </>
      )}
      </>}
    </ScrollView>
    <Fab />
    </>
  );
}

function BudgetMode({ goals }: { goals: boolean }) {
  const { color, type } = useTheme();
  return (
    <View style={{ flexDirection: "row", marginHorizontal: GUTTER, borderWidth: 1, borderColor: color.ink }}>
      {[
        { label: "Spending", selected: !goals, view: undefined },
        { label: "Goals", selected: goals, view: "goals" },
      ].map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="tab"
          accessibilityState={{ selected: item.selected }}
          onPress={() => router.setParams({ view: item.view })}
          style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: item.selected ? color.surfaceStrong : color.surface }}
        >
          <Text style={{ ...type.rowTitle, fontWeight: "800", color: item.selected ? color.onStrong : color.ink }}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function GoalsView() {
  const { color, type } = useTheme();
  const { spaceId, baseCurrency, canEdit } = useSpace();
  const goalState = useGoalsState(spaceId);
  const goals = goalState.goals;
  const active = goals.filter((item) => item.state !== "completed");
  const target = sumMinor(active.map((item) => item.goal.targetMinor));
  const tracked = sumMinor(active.map((item) => item.totalMinor));

  if (goalState.loading) return <ScreenLoading label="Loading goals" />;

  return (
    <View style={{ paddingTop: space.md, gap: space.md }}>
      <View style={{ marginHorizontal: GUTTER, padding: space.lg, backgroundColor: color.accent, gap: space.sm }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...type.eyebrow, color: color.onAccent }}>Shared goals</Text>
            <Text selectable style={{ fontFamily: DISPLAY_FONT, fontSize: 30, lineHeight: 34, color: color.onAccent }}>
              {formatWhole(tracked, baseCurrency)}
            </Text>
            <Text selectable style={{ ...type.rowSub, color: color.onAccent }}>
              tracked of {formatWhole(target, baseCurrency)} across {active.length} active {active.length === 1 ? "goal" : "goals"}
            </Text>
          </View>
          {canEdit && (
            <Pressable
              accessibilityLabel="Create a goal"
              onPress={() => router.push("/goal-editor" as never)}
              style={{ minHeight: 44, paddingHorizontal: space.md, alignItems: "center", justifyContent: "center", backgroundColor: color.brandLime }}
            >
              <Text style={{ ...type.rowTitle, fontWeight: "800", color: color.onBrand }}>New goal</Text>
            </Pressable>
          )}
        </View>
      </View>

      {goals.length === 0 ? (
        <View style={{ marginHorizontal: GUTTER, borderWidth: 1, borderColor: color.ink }}>
          <EmptyState
            symbol="◎"
            title="No goals yet"
            body="Track school fees, an emergency fund, rent or a trip without changing your monthly spending plan."
            action={canEdit ? { label: "Create a goal", href: "/goal-editor" } : undefined}
          />
        </View>
      ) : goals.map((summary) => <GoalCard key={summary.goal.id} summary={summary} />)}

      <Text selectable style={{ ...type.rowSub, lineHeight: 17, paddingHorizontal: GUTTER }}>
        Goals track progress only. They do not move money or change left to spend.
      </Text>
    </View>
  );
}

function Figure({ label, value, inverse = false }: { label: string; value: React.ReactNode; inverse?: boolean }) {
  const { color, type } = useTheme();

  return (
    <View style={{ gap: 2 }}>
      <Text style={{ ...type.statLabel, color: inverse ? color.onAccent : type.statLabel.color }}>{label}</Text>
      {value}
    </View>
  );
}

function Divider({ inverse = false }: { inverse?: boolean }) {
  const { color } = useTheme();
  return <View style={{ width: 1, height: 30, backgroundColor: inverse ? "#FFFFFF55" : color.hairline }} />;
}

function CategoryDistribution({
  rows,
  total,
}: {
  rows: { category: Category; spent: number; limit: number }[];
  total: number;
}) {
  const { color } = useTheme();
  if (total <= 0) return null;
  return (
    <View
      accessible
      accessibilityLabel={rows.filter((row) => row.spent > 0).map((row) => `${row.category.name} ${Math.round((row.spent / total) * 100)} percent`).join(", ")}
      style={{ height: 18, flexDirection: "row", marginTop: space.lg, borderWidth: 1, borderColor: color.onAccent }}
    >
      {rows.filter((row) => row.spent > 0).map((row) => (
        <View key={row.category.id} style={{ flex: row.spent, backgroundColor: CATEGORY_COLORS[row.category.colorKey] }} />
      ))}
    </View>
  );
}

function monthLabel(d: Date = new Date()): string {
  return d.toLocaleDateString(undefined, { month: "long" });
}
