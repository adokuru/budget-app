import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { Image } from "expo-image";
import { Q } from "@nozbe/watermelondb";
import { sumMinor, convertMinor, percentOf } from "@budget/shared";
import { database } from "@/db";
import type { Budget, Category, RecurringRule, Transaction } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { HeroCard } from "@/components/hero-card";
import { QuickActions } from "@/components/quick-actions";
import { CategoryBlock } from "@/components/category-block";
import { TransactionRow } from "@/components/transaction-row";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { MiniStat } from "@/components/mini-stat";
import { projectedRemaining } from "@/lib/recurring-engine";
import { monthStart, monthEnd, prevMonthStart } from "@/lib/period";
import { color, space, type } from "@/theme/tokens";

export default function HomeScreen() {
  const { spaceId, baseCurrency, displayCurrency, rates, space: current } = useSpace();
  const since = useMemo(() => monthStart().getTime(), []);
  const prevSince = useMemo(() => prevMonthStart().getTime(), []);

  const txns = useQuery<Transaction>(
    () =>
      database.get<Transaction>("transactions").query(
        Q.where("space_id", spaceId),
        Q.where("occurred_at", Q.gte(prevSince)),
        Q.sortBy("occurred_at", Q.desc)
      ),
    [spaceId, prevSince]
  );
  const categories = useQuery<Category>(
    () => database.get<Category>("categories").query(Q.where("space_id", spaceId)),
    [spaceId]
  );
  const budgets = useQuery<Budget>(
    () => database.get<Budget>("budgets").query(Q.where("space_id", spaceId), Q.where("period_start", since)),
    [spaceId, since]
  );
  const rules = useQuery<RecurringRule>(
    () =>
      database.get<RecurringRule>("recurring_rules")
        .query(Q.where("space_id", spaceId), Q.where("active", true)),
    [spaceId]
  );

  const thisMonth = txns.filter((t) => t.occurredAt.getTime() >= since);
  const lastMonth = txns.filter((t) => t.occurredAt.getTime() < since);

  // Reports read base_minor, the value frozen at entry, so a naira move never
  // silently re-prices a month that already happened.
  const income = sumMinor(thisMonth.filter((t) => t.kind === "income").map((t) => t.baseMinor));
  const spent = sumMinor(thisMonth.filter((t) => t.kind === "expense").map((t) => t.baseMinor));
  const spentLast = sumMinor(lastMonth.filter((t) => t.kind === "expense").map((t) => t.baseMinor));
  const budgeted = sumMinor(budgets.map((b) => b.amountMinor));

  const toDisplay = (m: number) =>
    baseCurrency === displayCurrency ? m : convertMinor(m, baseCurrency, displayCurrency, rates);

  const projection = useMemo(
    () => projectedRemaining(rules, Date.now(), monthEnd().getTime()),
    [rules]
  );

  const left = budgeted > 0 ? budgeted - spent : income - spent;
  const deltaPct = spentLast > 0 ? Math.round(((spent - spentLast) / spentLast) * 100) : null;

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of thisMonth) {
      if (t.kind !== "expense") continue;
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.baseMinor);
    }
    return categories
      .filter((c) => (totals.get(c.id) ?? 0) > 0)
      .map((c) => ({
        category: c,
        total: totals.get(c.id)!,
        limit: budgets.find((b) => b.categoryId === c.id)?.amountMinor,
      }))
      .sort((a, b) => b.total - a.total);
  }, [thisMonth, categories, budgets]);

  const segments = byCategory.map(({ category, total }) => ({
    id: category.id, colorKey: category.colorKey, value: total,
  }));

  const recent = thisMonth.slice(0, 4);
  const catFor = (id: string) => categories.find((c) => c.id === id);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 140 }}
    >
      <HeroCard
        label={budgeted > 0 ? "Left to spend" : "Net this month"}
        minor={toDisplay(left)}
        currency={displayCurrency}
        segments={segments}
        spentMinor={toDisplay(spent)}
        limitMinor={budgeted > 0 ? toDisplay(budgeted) : undefined}
        deltaPct={deltaPct}
        period={current.name}
        onPressPeriod={undefined}
      />

      <QuickActions />

      {projection.incomeMinor > 0 || projection.expenseMinor > 0 ? (
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <MiniStat
            label="Expected in"
            minor={toDisplay(projection.incomeMinor)}
            currency={displayCurrency}
            symbol="arrow.down.circle.fill"
            tone={color.accent}
          />
          <MiniStat
            label="Still due"
            minor={toDisplay(projection.expenseMinor)}
            currency={displayCurrency}
            symbol="clock.fill"
            tone={color.warning}
          />
        </View>
      ) : null}

      {byCategory.length === 0 ? (
        <EmptyState
          symbol="tray"
          title="Nothing logged yet"
          body="Tap Add to log your first expense. Rent, salary and subscriptions live in Recurring."
        />
      ) : (
        <>
          <SectionHeader
            title="Where it went"
            trailing={`${byCategory.length} ${byCategory.length === 1 ? "category" : "categories"}`}
          />
          <View style={{ gap: space.sm }}>
            {byCategory.map(({ category, total, limit }, i) => (
              <CategoryBlock
                key={category.id}
                index={i}
                name={category.name}
                colorKey={category.colorKey}
                symbol={category.symbol}
                spentMinor={toDisplay(total)}
                limitMinor={limit === undefined ? undefined : toDisplay(limit)}
                shareOfSpend={percentOf(total, spent) ?? 0}
                currency={displayCurrency}
              />
            ))}
          </View>
        </>
      )}

      {recent.length > 0 && (
        <>
          <SectionHeader title="Recent" />
          <View style={{ gap: space.xs }}>
            {recent.map((t) => (
              <TransactionRow
                key={t.id}
                note={t.note ?? catFor(t.categoryId)?.name ?? "Expense"}
                categoryName={catFor(t.categoryId)?.name ?? ""}
                colorKey={catFor(t.categoryId)?.colorKey ?? "teal"}
                symbol={catFor(t.categoryId)?.symbol ?? "circle"}
                minor={toDisplay(t.kind === "income" ? t.baseMinor : -t.baseMinor)}
                currency={displayCurrency}
                occurredAt={t.occurredAt}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
