import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { Q } from "@nozbe/watermelondb";
import { sumMinor, convertMinor, percentOf, formatWhole, FALLBACK_EMOJI } from "@budget/shared";
import { database } from "@/db";
import type { Budget, Category, Transaction } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { Amt, AmtShort } from "@/components/amt";
import { AppHeader } from "@/components/app-header";
import { Rule, Label, Thin, EmojiPlain, Row, SectionCard } from "@/components/primitives";
import { EmptyState } from "@/components/empty-state";
import { Fab } from "@/components/fab";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useTheme } from "@/hooks/use-theme";
import { monthStart } from "@/lib/period";
import { space, CATEGORY_COLORS } from "@/theme/tokens";

export default function BudgetScreen() {
  const { color, type } = useTheme();
  const { spaceId, baseCurrency, displayCurrency, rates, space: current, isShared } = useSpace();
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
    () => database.get<Category>("categories")
      .query(Q.where("space_id", spaceId), Q.sortBy("sort", Q.asc)),
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
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      <AppHeader spaceName={current.name} isShared={isShared} />

      <SectionCard style={{ marginTop: space.sm, padding: space.lg }}>
        <Text style={{ ...type.eyebrow, marginBottom: space.sm }}>
          {monthLabel()} budget
        </Text>
        <Amt minor={toDisplay(budgeted)} currency={displayCurrency} size="xl" />

        <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg, marginTop: space.base }}>
          <Figure label="Spent" value={<AmtShort minor={toDisplay(totalSpent)} currency={displayCurrency} size={15} />} />
          <Divider />
          <Figure
            label="Remaining"
            value={
              <AmtShort
                minor={toDisplay(remaining)}
                currency={displayCurrency}
                size={15}
                tone={remaining < 0 ? color.danger : color.positive}
              />
            }
          />
          <Divider />
          <Figure
            label="Used"
            value={
              <Text style={{ fontSize: 15, fontWeight: "800", color: color.ink }}>
                {used === null ? "—" : `${used}%`}
              </Text>
            }
          />
        </View>
      </SectionCard>

      {rows.length === 0 ? (
        <SectionCard style={{ marginTop: space.lg }}>
          <EmptyState
            symbol="🎯"
            title="No budgets set"
            body="Set a monthly spending limit for a category, such as ₦200,000 for food. Kobo Tracker will show what you have left."
            action={{ label: "Set a budget", href: "/budget-editor" }}
          />
        </SectionCard>
      ) : (
        <>
          <Label
            action={
              <Link href="/budget-editor" asChild>
                <Pressable hitSlop={10}>
                  <Text style={type.action}>Edit</Text>
                </Pressable>
              </Link>
            }
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
    </ScrollView>
    <Fab />
    </>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  const { type } = useTheme();

  return (
    <View style={{ gap: 2 }}>
      <Text style={type.statLabel}>{label}</Text>
      {value}
    </View>
  );
}

function Divider() {
  const { color } = useTheme();
  return <View style={{ width: 1, height: 30, backgroundColor: color.hairline }} />;
}

function monthLabel(d: Date = new Date()): string {
  return d.toLocaleDateString(undefined, { month: "long" });
}
