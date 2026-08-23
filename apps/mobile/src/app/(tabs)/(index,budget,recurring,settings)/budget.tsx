import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { Image } from "expo-image";
import { Q } from "@nozbe/watermelondb";
import { sumMinor, convertMinor, percentOf } from "@budget/shared";
import { database } from "@/db";
import type { Budget, Category, Transaction } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { RadialSpend, type Segment } from "@/components/radial-spend";
import { CategoryBlock } from "@/components/category-block";
import { MiniStat } from "@/components/mini-stat";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/badge";
import { monthStart } from "@/lib/period";
import { color, space, radius, type, CONTINUOUS, tint } from "@/theme/tokens";

export default function BudgetScreen() {
  const { spaceId, baseCurrency, displayCurrency, rates } = useSpace();
  const since = useMemo(() => monthStart().getTime(), []);

  const txns = useQuery<Transaction>(
    () =>
      database.get<Transaction>("transactions").query(
        Q.where("space_id", spaceId), Q.where("kind", "expense"),
        Q.where("occurred_at", Q.gte(since))
      ),
    [spaceId, since]
  );
  const categories = useQuery<Category>(
    () => database.get<Category>("categories").query(Q.where("space_id", spaceId)),
    [spaceId]
  );
  const budgets = useQuery<Budget>(
    () => database.get<Budget>("budgets")
      .query(Q.where("space_id", spaceId), Q.where("period_start", since)),
    [spaceId, since]
  );

  const toDisplay = (m: number) =>
    baseCurrency === displayCurrency ? m : convertMinor(m, baseCurrency, displayCurrency, rates);

  const spentBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.baseMinor);
    return m;
  }, [txns]);

  const total = sumMinor([...spentBy.values()]);
  const budgeted = sumMinor(budgets.map((b) => b.amountMinor));
  const onTrack = budgeted === 0 || total <= budgeted;

  const segments: Segment[] = useMemo(
    () =>
      categories
        .filter((c) => (spentBy.get(c.id) ?? 0) > 0)
        .map((c) => ({ id: c.id, colorKey: c.colorKey, value: spentBy.get(c.id)! }))
        .sort((a, b) => b.value - a.value),
    [categories, spentBy]
  );

  const envelopes = budgets
    .map((b) => ({ budget: b, category: categories.find((c) => c.id === b.categoryId) }))
    .filter((e): e is { budget: Budget; category: Category } => Boolean(e.category))
    .sort((a, b) =>
      (percentOf(spentBy.get(b.category.id) ?? 0, b.budget.amountMinor) ?? 0) -
      (percentOf(spentBy.get(a.category.id) ?? 0, a.budget.amountMinor) ?? 0)
    );

  const overCount = envelopes.filter(
    (e) => (spentBy.get(e.category.id) ?? 0) > e.budget.amountMinor
  ).length;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 140 }}
    >
      <View
        style={{
          backgroundColor: color.card, borderRadius: radius.card, ...CONTINUOUS,
          paddingVertical: space.xl, alignItems: "center", gap: space.base,
        }}
      >
        {segments.length > 0 ? (
          <RadialSpend
            segments={segments}
            totalMinor={toDisplay(total)}
            currency={displayCurrency}
          />
        ) : (
          <Text style={{ ...type.caption, color: color.muted, paddingVertical: space.xxl }}>
            No spending this month yet
          </Text>
        )}

        {budgeted > 0 && (
          <Badge
            label={onTrack ? "On track" : `${overCount} over budget`}
            background={tint(onTrack ? color.accent : color.danger, 0.14)}
            tone={onTrack ? color.accent : color.danger}
          />
        )}

        {segments.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingHorizontal: space.lg,
                         justifyContent: "center" }}>
            {segments.slice(0, 5).map((s) => {
              const cat = categories.find((c) => c.id === s.id)!;
              return (
                <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4,
                                 backgroundColor: color.category[cat.colorKey] }} />
                  <Text style={{ ...type.caption, color: color.muted }}>{cat.name}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: space.sm }}>
        <MiniStat label="Budgeted" minor={toDisplay(budgeted)} currency={displayCurrency}
                  symbol="target" tone={color.accent} />
        <MiniStat label="Spent" minor={toDisplay(total)} currency={displayCurrency}
                  symbol="creditcard.fill" tone={color.warning} />
      </View>

      <SectionHeader
        title="Envelopes"
        trailing={envelopes.length ? `${envelopes.length} set` : undefined}
      />

      {envelopes.length === 0 ? (
        <EmptyState
          symbol="chart.pie"
          title="No envelopes yet"
          body="Set a monthly limit per category — ₦200,000 for food, say — and this screen tracks you against it."
          action={{ label: "Set a budget", href: "/budget-editor" }}
        />
      ) : (
        <>
          <View style={{ gap: space.sm }}>
            {envelopes.map(({ budget, category }, i) => (
              <CategoryBlock
                key={budget.id}
                index={i}
                name={category.name}
                colorKey={category.colorKey}
                symbol={category.symbol}
                spentMinor={toDisplay(spentBy.get(category.id) ?? 0)}
                limitMinor={toDisplay(budget.amountMinor)}
                shareOfSpend={percentOf(spentBy.get(category.id) ?? 0, total) ?? 0}
                currency={displayCurrency}
              />
            ))}
          </View>

          <Link href="/budget-editor" asChild>
            <Pressable
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                height: 46, borderRadius: radius.pill, backgroundColor: color.card,
              }}
            >
              <Image source="sf:plus" tintColor={color.accent} style={{ width: 14, height: 14 }} />
              <Text style={{ ...type.label, fontWeight: "600", color: color.accent }}>
                Add or edit a budget
              </Text>
            </Pressable>
          </Link>
        </>
      )}
    </ScrollView>
  );
}
