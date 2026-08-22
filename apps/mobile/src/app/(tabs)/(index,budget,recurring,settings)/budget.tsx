import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { Q } from "@nozbe/watermelondb";
import { sumMinor, convertMinor } from "@budget/shared";
import { database } from "@/db";
import type { Budget, Category, Transaction } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { RadialSpend, type Segment } from "@/components/radial-spend";
import { EnvelopeBar } from "@/components/envelope-bar";
import { EmptyState } from "@/components/empty-state";
import { monthStart } from "@/lib/period";
import { color, space, radius, type, CONTINUOUS } from "@/theme/tokens";

export default function BudgetScreen() {
  const { spaceId, baseCurrency, displayCurrency, rates } = useSpace();
  const since = useMemo(() => monthStart().getTime(), []);

  const txns = useQuery<Transaction>(
    () =>
      database.get<Transaction>("transactions").query(
        Q.where("space_id", spaceId),
        Q.where("kind", "expense"),
        Q.where("occurred_at", Q.gte(since))
      ),
    [spaceId, since]
  );
  const categories = useQuery<Category>(
    () => database.get<Category>("categories").query(Q.where("space_id", spaceId)),
    [spaceId]
  );
  const budgets = useQuery<Budget>(
    () =>
      database.get<Budget>("budgets").query(
        Q.where("space_id", spaceId),
        Q.where("period_start", since)
      ),
    [spaceId, since]
  );

  const toDisplay = (m: number) =>
    baseCurrency === displayCurrency ? m : convertMinor(m, baseCurrency, displayCurrency, rates);

  const spentBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.baseMinor);
    return m;
  }, [txns]);

  const segments: Segment[] = useMemo(
    () =>
      categories
        .filter((c) => (spentBy.get(c.id) ?? 0) > 0)
        .map((c) => ({ id: c.id, colorKey: c.colorKey, value: spentBy.get(c.id)! }))
        .sort((a, b) => b.value - a.value),
    [categories, spentBy]
  );

  const total = sumMinor([...spentBy.values()]);
  const envelopes = budgets
    .map((b) => ({ budget: b, category: categories.find((c) => c.id === b.categoryId) }))
    .filter((e): e is { budget: Budget; category: Category } => Boolean(e.category));

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 120 }}
    >
      <View
        style={{
          backgroundColor: color.card, borderRadius: radius.card, ...CONTINUOUS,
          paddingVertical: space.xl, alignItems: "center",
        }}
      >
        {segments.length > 0 ? (
          <RadialSpend
            segments={segments}
            totalMinor={toDisplay(total)}
            currency={displayCurrency}
          />
        ) : (
          <Text style={{ ...type.caption, color: color.muted }}>No spending this month yet</Text>
        )}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ ...type.heading, color: color.ink }}>Envelopes</Text>
        <Link href="/budget-editor" asChild>
          <Pressable hitSlop={10}>
            <Text style={{ ...type.label, color: color.accent, fontWeight: "600" }}>
              {envelopes.length ? "Manage" : "Set budgets"}
            </Text>
          </Pressable>
        </Link>
      </View>

      {envelopes.length === 0 ? (
        <EmptyState
          symbol="chart.pie"
          title="No envelopes yet"
          body="Set a monthly limit per category — ₦200,000 for food, say — and this screen tracks you against it."
        />
      ) : (
        <View style={{ gap: space.sm }}>
          {envelopes.map(({ budget, category }) => (
            <EnvelopeBar
              key={budget.id}
              name={category.name}
              colorKey={category.colorKey}
              symbol={category.symbol}
              spentMinor={toDisplay(spentBy.get(category.id) ?? 0)}
              limitMinor={toDisplay(budget.amountMinor)}
              currency={displayCurrency}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
