import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { Q } from "@nozbe/watermelondb";
import { router, useSegments } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  sumMinor, convertMinor, percentOf, formatWhole, FALLBACK_EMOJI,
} from "@budget/shared";
import { database } from "@/db";
import type { Budget, Category, RecurringRule, Transaction } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { Amt, AmtShort } from "@/components/amt";
import { AppHeader } from "@/components/app-header";
import { Rule, Label, Thin, Emoji, EmojiPlain, Row, SectionCard, StatStrip } from "@/components/primitives";
import { EmptyState } from "@/components/empty-state";
import { Fab } from "@/components/fab";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useTheme } from "@/hooks/use-theme";
import { projectedRemaining } from "@/lib/recurring-engine";
import { monthStart, monthEnd, formatRelativeDay } from "@/lib/period";
import { space, GUTTER, radius, CATEGORY_COLORS, CONTINUOUS } from "@/theme/tokens";
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
  const { spaceId, baseCurrency, displayCurrency, rates, space: current, isShared } = useSpace();
  const since = useMemo(() => monthStart().getTime(), []);

  const txns = useQuery<Transaction>(
    () =>
      database.get<Transaction>("transactions").query(
        Q.where("space_id", spaceId),
        Q.where("occurred_at", Q.gte(since)),
        Q.sortBy("occurred_at", Q.desc)
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
  const rules = useQuery<RecurringRule>(
    () => database.get<RecurringRule>("recurring_rules")
      .query(Q.where("space_id", spaceId), Q.where("active", true)),
    [spaceId]
  );

  // Reports read base_minor, the value frozen at entry, so a naira move never
  // silently re-prices a month that already happened.
  const income = sumMinor(txns.filter((t) => t.kind === "income").map((t) => t.baseMinor));
  const spent = sumMinor(txns.filter((t) => t.kind === "expense").map((t) => t.baseMinor));
  const budgeted = sumMinor(budgets.map((b) => b.amountMinor));

  const ceiling = budgeted > 0 ? budgeted : income;
  const left = ceiling - spent;
  const pct = percentOf(spent, ceiling);

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
    for (const t of txns) {
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
  }, [txns, categories, budgets]);

  const upcoming = rules
    .filter((r) => r.kind === "expense")
    .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())
    .slice(0, 4);

  const pendingIncome = rules.filter((r) => r.kind === "income" && !r.autoPost);
  const topSpending = spending.slice(0, 4);

  return (
    <>
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      <AppHeader spaceName={current.name} isShared={isShared} />

      <View
        style={{
          marginHorizontal: GUTTER, marginTop: space.sm, padding: space.lg,
          backgroundColor: color.surfaceStrong, borderRadius: radius.card, ...CONTINUOUS,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ ...type.eyebrow, color: "#FFFFFFA6" }}>
            {budgeted > 0 ? "Left to spend" : "Available this month"} · {monthLabel()}
          </Text>
          {ceiling > 0 && (
            <View
              style={{
                paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill,
                backgroundColor: left < 0 ? color.danger : color.brandLime,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "800", color: left < 0 ? color.onAccent : color.onBrand }}>
                {left < 0 ? "Over budget" : "On track"}
              </Text>
            </View>
          )}
        </View>
        <View style={{ marginTop: space.sm }}>
          <Amt minor={toDisplay(left)} currency={displayCurrency} size="xl"
               tone={left < 0 ? color.danger : color.onStrong} />
        </View>
        <Text style={{ ...type.meta, color: "#FFFFFFA6", marginTop: space.sm }}>
          {ceiling > 0
            ? `of ${formatWhole(toDisplay(ceiling), displayCurrency)}${pct !== null ? ` · ${pct}% used` : ""}`
            : `${formatWhole(toDisplay(spent), displayCurrency)} spent · no budget set`}
        </Text>
        <View style={{ marginTop: space.base }}>
          <Thin spent={spent} budget={ceiling} tone={color.brandLime} trackColor="#FFFFFF2E" />
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
              <Pressable onPress={() => router.push("/(tabs)/(budget)/budget")} hitSlop={10}>
                <Text style={type.action}>View all</Text>
              </Pressable>
            ) : undefined}
          >
            Spending
          </Label>
          <SectionCard>
            {topSpending.map(({ category, spent: catSpent, limit }, i) => (
              <View key={category.id}>
                <Row>
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
                        {limit
                          ? `${formatWhole(toDisplay(limit - catSpent), displayCurrency)} left`
                          : "no limit"}
                      </Text>
                    </View>
                    <Thin
                      spent={catSpent}
                      budget={limit ?? catSpent}
                      tone={CATEGORY_COLORS[category.colorKey]}
                    />
                  </View>
                  <AmtShort minor={toDisplay(catSpent)} currency={displayCurrency} />
                </Row>
                {i < topSpending.length - 1 && <Rule full />}
              </View>
            ))}
          </SectionCard>
        </>
      )}

      {/* ── Recent ── */}
      {txns.length > 0 && (
        <>
          <Label>Recent</Label>
          <SectionCard>
            {txns.slice(0, 6).map((t, i, arr) => {
              const cat = catFor(t.categoryId);
              return (
                <View key={t.id}>
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
