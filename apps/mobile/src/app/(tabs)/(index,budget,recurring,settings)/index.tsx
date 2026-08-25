import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { Q } from "@nozbe/watermelondb";
import { router, useSegments } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  sumMinor, convertMinor, percentOf, formatWhole, availableThisMonth, calendarDay, FALLBACK_EMOJI,
  type Currency,
} from "@budget/shared";
import { database } from "@/db";
import type { Budget, Category, RecurringRule, Transaction } from "@/db/models";
import { useQueryState } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { Amt, AmtShort } from "@/components/amt";
import { AppHeader } from "@/components/app-header";
import { Rule, Label, Thin, Emoji, EmojiPlain, Row, ScreenLoading, SectionCard, StatStrip } from "@/components/primitives";
import { EmptyState } from "@/components/empty-state";
import { Fab, FAB_CONTENT_PADDING_BOTTOM } from "@/components/fab";
import { GoalCard } from "@/components/goal-card";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useTheme } from "@/hooks/use-theme";
import { useGoalsState } from "@/hooks/use-goals";
import { projectedRemaining } from "@/lib/recurring-engine";
import { monthStart, monthEnd, formatRelativeDay } from "@/lib/period";
import { space, GUTTER, radius, DISPLAY_FONT, TABULAR } from "@/theme/tokens";
import BudgetScreen from "./budget";
import RecurringScreen from "./recurring";
import SettingsScreen from "./settings";

export default function TabRootScreen() {
  const group = useSegments().find((segment) => /^\((index|budget|recurring|settings)\)$/.test(segment));

  if (group === "(budget)") return <BudgetScreen />;
  if (group === "(recurring)") return <RecurringScreen />;
  if (group === "(settings)") return <SettingsScreen />;
  return <HomeScreen />;
}

function HomeScreen() {
  const { color, type } = useTheme();
  const { spaceId, baseCurrency, displayCurrency, rates, space: current, isShared, canEdit } = useSpace();
  const goalState = useGoalsState(spaceId);
  const goals = goalState.goals;
  const since = useMemo(() => monthStart().getTime(), []);
  const historySince = useMemo(() => {
    const date = monthStart();
    date.setMonth(date.getMonth() - 2);
    return date.getTime();
  }, []);

  const txnState = useQueryState<Transaction>(
    () =>
      database.get<Transaction>("transactions").query(
        Q.where("space_id", spaceId),
        Q.where("occurred_at", Q.gte(historySince)),
        Q.sortBy("occurred_at", Q.desc)
      ),
    [spaceId, historySince]
  );
  const categoryState = useQueryState<Category>(
    () => database.get<Category>("categories").query(Q.where("space_id", spaceId)),
    [spaceId]
  );
  const budgetState = useQueryState<Budget>(
    () => database.get<Budget>("budgets")
      .query(Q.where("space_id", spaceId), Q.where("period_start", since)),
    [spaceId, since]
  );
  const ruleState = useQueryState<RecurringRule>(
    () => database.get<RecurringRule>("recurring_rules")
      .query(Q.where("space_id", spaceId), Q.where("active", true)),
    [spaceId]
  );

  const txns = txnState.rows;
  const categories = categoryState.rows;
  const budgets = budgetState.rows;
  const rules = ruleState.rows;
  const loading = txnState.loading || categoryState.loading || budgetState.loading || ruleState.loading || goalState.loading;

  // Reports read base_minor, the value frozen at entry, so a naira move never
  // silently re-prices a month that already happened.
  const monthTxns = useMemo(
    () => txns.filter((t) => t.occurredAt.getTime() >= since),
    [txns, since]
  );
  const income = sumMinor(monthTxns.filter((t) => t.kind === "income").map((t) => t.baseMinor));
  const spent = sumMinor(monthTxns.filter((t) => t.kind === "expense").map((t) => t.baseMinor));
  const budgeted = sumMinor(budgets.map((b) => b.amountMinor));

  const spendingLimit = budgeted > 0 ? budgeted : income;
  const left = availableThisMonth(income, spent);
  const pct = percentOf(spent, spendingLimit);
  const overPlan = spendingLimit > 0 && spent > spendingLimit;

  const projection = useMemo(
    () => projectedRemaining(rules, Date.now(), monthEnd().getTime()),
    [rules]
  );
  const projected = left + projection.incomeMinor - projection.expenseMinor;

  const toDisplay = (m: number) =>
    baseCurrency === displayCurrency ? m : convertMinor(m, baseCurrency, displayCurrency, rates);

  const catFor = (id: string) => categories.find((c) => c.id === id);

  const spending = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of monthTxns) {
      if (t.kind !== "expense") continue;
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.baseMinor);
    }
    return categories
      .filter((c) => (totals.get(c.id) ?? 0) > 0)
      .map((c) => ({
        category: c,
        spent: totals.get(c.id)!,
        limit: budgets.find((b) => b.categoryId === c.id)?.amountMinor,
      }))
      .sort((a, b) => b.spent - a.spent);
  }, [monthTxns, categories, budgets]);

  const upcoming = rules
    .filter((r) => r.kind === "expense")
    .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())
    .slice(0, 4);

  const today = calendarDay(Date.now());
  const pendingIncome = rules.filter(
    (r) => r.kind === "income" && !r.autoPost && r.nextRunAt.getTime() <= today
  );
  const topSpending = spending.slice(0, 4);

  if (loading) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: color.canvas }}>
        <AppHeader spaceName={current.name} isShared={isShared} />
        <ScreenLoading label="Loading your plan" />
      </ScrollView>
    );
  }

  return (
    <>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: FAB_CONTENT_PADDING_BOTTOM }}
    >
      <AppHeader spaceName={current.name} isShared={isShared} />

      <View
        style={{
          marginTop: space.sm, paddingHorizontal: GUTTER, paddingVertical: space.xl,
          backgroundColor: color.brandLime,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ ...type.eyebrow, color: color.onBrand }}>
            Available this month · {monthLabel()}
          </Text>
          {spendingLimit > 0 && (
            <View
              style={{
                paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill,
                backgroundColor: color.surfaceStrong,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "800", color: color.onStrong }}>
                {overPlan ? "Over plan" : "On track"}
              </Text>
            </View>
          )}
        </View>
        <View style={{ marginTop: space.sm }}>
          <Amt minor={toDisplay(left)} currency={displayCurrency} size="xl" tone={color.onBrand} />
        </View>
        <Text style={{ ...type.meta, color: color.onBrand, marginTop: space.sm }}>
          {income > 0
            ? `${formatWhole(toDisplay(income), displayCurrency)} received · ${formatWhole(toDisplay(spent), displayCurrency)} spent`
            : spendingLimit > 0
              ? `${formatWhole(toDisplay(spendingLimit), displayCurrency)} planned${pct !== null ? ` · ${pct}% used` : ""}`
            : `${formatWhole(toDisplay(spent), displayCurrency)} spent · no budget set`}
        </Text>
        <View style={{ marginTop: space.base }}>
          <Thin spent={spent} budget={spendingLimit} tone={color.ink} trackColor="#11162A2E" />
        </View>
      </View>

      <SectionCard style={{ marginTop: space.md }}>
        <StatStrip
          items={[
            { label: "Income", value: <AmtShort minor={toDisplay(income)} currency={displayCurrency} tone={color.positive} size={15} /> },
            { label: "Spent", value: <AmtShort minor={toDisplay(spent)} currency={displayCurrency} size={15} /> },
            { label: "Expected left", value: <AmtShort minor={toDisplay(projected)} currency={displayCurrency} size={15} tone={projected < 0 ? color.danger : color.ink} /> },
          ]}
        />
      </SectionCard>

      <ThreeMonthBars txns={txns} toDisplay={toDisplay} currency={displayCurrency} />

      {goals.some((item) => item.state !== "completed") && (
        <>
          <Label
            action={(
              <Pressable
                accessibilityLabel="View all goals"
                onPress={() => router.push({ pathname: "/(tabs)/(budget)/budget", params: { view: "goals" } })}
                hitSlop={10}
              >
                <Text style={type.action}>View all</Text>
              </Pressable>
            )}
          >
            Goals
          </Label>
          <View style={{ gap: space.sm }}>
            {goals.filter((item) => item.state !== "completed").slice(0, 2).map((summary) => (
              <GoalCard key={summary.goal.id} summary={summary} compact />
            ))}
          </View>
        </>
      )}

      {/* ── Salary confirmation ── */}
      {pendingIncome.length > 0 && (
        <>
          <Label>Expected income</Label>
          <SectionCard>
            {pendingIncome.map((r, i) => (
              <View key={r.id}>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/(recurring)/recurring"); }}
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingHorizontal: space.base, paddingVertical: space.base + 2,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, flex: 1 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color.warning }} />
                    <Text style={{ ...type.body, color: color.body }} numberOfLines={1}>
                      {r.label} expected · {formatWhole(toDisplay(r.amountMinor), displayCurrency)}
                    </Text>
                  </View>
                  <Text style={{ ...type.action, color: color.warning }}>Review</Text>
                </Pressable>
                {i < pendingIncome.length - 1 && <Rule full />}
              </View>
            ))}
          </SectionCard>
        </>
      )}

      {/* ── Spending ── */}
      {spending.length === 0 ? (
        <SectionCard style={{ marginTop: space.lg }}>
          <EmptyState
            symbol="🧾"
            title="Nothing logged yet"
            body="Tap + to add your first expense or income. Add rent, salary and subscriptions under Recurring."
          />
        </SectionCard>
      ) : (
        <>
          <Label
            action={spending.length > topSpending.length ? (
              <Pressable accessibilityLabel="View all spending" onPress={() => router.push("/(tabs)/(budget)/budget")} hitSlop={10}>
                <Text style={type.action}>View all</Text>
              </Pressable>
            ) : undefined}
          >
            Spending
          </Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, paddingHorizontal: GUTTER }}>
            {topSpending.map(({ category, spent: catSpent, limit }, index) => (
              <Pressable
                key={category.id}
                accessibilityLabel={`${category.name}, ${formatWhole(toDisplay(catSpent), displayCurrency)} spent${limit ? `, ${formatWhole(toDisplay(limit - catSpent), displayCurrency)} left` : ""}`}
                onPress={() => router.push("/(tabs)/(budget)/budget")}
                style={{
                  width: index === 0 ? 126 : 112, height: index === 0 ? 126 : 112,
                  borderRadius: 999, alignItems: "center", justifyContent: "center",
                  padding: space.md, borderWidth: 1, borderColor: color.ink,
                  backgroundColor: index % 2 === 0 ? color.surfaceStrong : color.surface,
                }}
              >
                <Text style={{ fontSize: 20 }}>{category.emoji || FALLBACK_EMOJI}</Text>
                <Text numberOfLines={1} style={{ ...type.rowSub, color: index % 2 === 0 ? color.onStrong : color.ink }}>{category.name}</Text>
                <AmtShort minor={toDisplay(catSpent)} currency={displayCurrency} tone={index % 2 === 0 ? color.brandLime : color.ink} size={18} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* ── Recent ── */}
      {txns.length > 0 && (
        <>
          <Label
            action={(
              <Pressable accessibilityLabel="View all transactions" onPress={() => router.push("/transactions")} hitSlop={10}>
                <Text style={type.action}>View all</Text>
              </Pressable>
            )}
          >
            Recent
          </Label>
          <SectionCard>
            {txns.slice(0, 6).map((t, i, arr) => {
              const cat = catFor(t.categoryId);
              return (
                <View key={t.id}>
                  <Pressable
                    accessibilityLabel={canEdit ? `Edit ${t.note || cat?.name || "entry"}` : undefined}
                    disabled={!canEdit}
                    onPress={() => router.push({ pathname: "/add-expense", params: { id: t.id } })}
                  >
                    <Row>
                    <Emoji glyph={cat?.emoji || FALLBACK_EMOJI} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ ...type.rowTitle, color: color.ink }} numberOfLines={1}>
                        {t.note || cat?.name || "Entry"}
                      </Text>
                      <Text style={type.rowSub}>{formatRelativeDay(t.occurredAt)}</Text>
                    </View>
                    <Amt
                      minor={toDisplay(t.kind === "income" ? t.baseMinor : -t.baseMinor)}
                      currency={displayCurrency}
                      size="sm"
                      signed
                      hideFraction
                      tone={t.kind === "income" ? color.positive : color.ink}
                    />
                    </Row>
                  </Pressable>
                  {i < arr.length - 1 && <Rule full />}
                </View>
              );
            })}
          </SectionCard>
        </>
      )}

      {/* ── Upcoming ── */}
      {upcoming.length > 0 && (
        <>
          <Label>Upcoming payments</Label>
          <SectionCard>
            {upcoming.map((r, i) => (
              <View key={r.id}>
                <Row>
                  <EmojiPlain glyph={catFor(r.categoryId)?.emoji || FALLBACK_EMOJI} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ ...type.rowTitle, color: color.ink }} numberOfLines={1}>
                      {r.label}
                    </Text>
                    <Text style={type.rowSub}>{formatRelativeDay(r.nextRunAt)}</Text>
                  </View>
                  <Amt minor={toDisplay(r.amountMinor)} currency={displayCurrency}
                       size="sm" hideFraction />
                </Row>
                {i < upcoming.length - 1 && <Rule full />}
              </View>
            ))}
          </SectionCard>
        </>
      )}
    </ScrollView>
    <Fab />
    </>
  );
}

function monthLabel(d: Date = new Date()): string {
  return d.toLocaleDateString(undefined, { month: "long" });
}

function ThreeMonthBars({
  txns,
  toDisplay,
  currency,
}: {
  txns: Transaction[];
  toDisplay: (minor: number) => number;
  currency: Currency;
}) {
  const { color, type } = useTheme();
  const months = Array.from({ length: 3 }, (_, offset) => {
    const date = monthStart();
    date.setMonth(date.getMonth() - (2 - offset));
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    const rows = txns.filter((txn) => {
      const at = txn.occurredAt.getTime();
      return at >= date.getTime() && at < next.getTime();
    });
    return {
      label: date.toLocaleDateString(undefined, { month: "short" }),
      income: sumMinor(rows.filter((txn) => txn.kind === "income").map((txn) => txn.baseMinor)),
      spent: sumMinor(rows.filter((txn) => txn.kind === "expense").map((txn) => txn.baseMinor)),
    };
  });
  const max = Math.max(1, ...months.flatMap((month) => [month.income, month.spent]));

  return (
    <View style={{ marginTop: space.md, marginHorizontal: GUTTER, padding: space.lg, backgroundColor: color.accent }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ ...type.eyebrow, color: color.onAccent }}>Income vs spending</Text>
        <View style={{ flexDirection: "row", gap: space.md }}>
          <Text style={{ ...type.rowSub, color: color.onAccent }}>■ Income</Text>
          <Text style={{ ...type.rowSub, color: color.onAccent }}>▧ Spent</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 142, gap: space.lg, paddingTop: space.lg }}>
        {months.map((month) => (
          <View
            key={month.label}
            accessible
            accessibilityLabel={`${month.label}: ${formatWhole(toDisplay(month.income), currency)} income, ${formatWhole(toDisplay(month.spent), currency)} spent`}
            style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: space.sm }}
          >
            <View style={{ height: 104, flexDirection: "row", alignItems: "flex-end", gap: 5 }}>
              <View style={{ width: 22, height: Math.max(4, (month.income / max) * 104), backgroundColor: color.brandLime }} />
              <View style={{ width: 22, height: Math.max(4, (month.spent / max) * 104), backgroundColor: color.surfaceStrong, borderWidth: 1, borderColor: color.onAccent }} />
            </View>
            <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 11, color: color.onAccent, ...TABULAR }}>{month.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
