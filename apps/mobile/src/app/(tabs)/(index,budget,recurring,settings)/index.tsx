import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Q } from "@nozbe/watermelondb";
import { router } from "expo-router";
import { Image } from "expo-image";
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
import { Rule, Label, Thin, Emoji, EmojiPlain, Row, StatStrip } from "@/components/primitives";
import { EmptyState } from "@/components/empty-state";
import { Fab } from "@/components/fab";
import { projectedRemaining } from "@/lib/recurring-engine";
import { monthStart, monthEnd, formatRelativeDay } from "@/lib/period";
import { color, space, GUTTER, radius, type, CATEGORY_COLORS } from "@/theme/tokens";

export default function HomeScreen() {
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

  return (
    <>
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      <AppHeader spaceName={current.name} isShared={isShared} />

      {/* ── Balance ── */}
      <View style={{ paddingHorizontal: GUTTER, paddingTop: space.base, paddingBottom: space.xl }}>
        <Text style={{ ...type.eyebrow, marginBottom: space.sm }}>
          {budgeted > 0 ? "Left to spend" : "Net this month"} · {monthLabel()}
        </Text>
        <Amt minor={toDisplay(left)} currency={displayCurrency} size="xl"
             tone={left < 0 ? color.danger : color.ink} />
        <Text style={{ ...type.meta, marginTop: space.sm }}>
          {ceiling > 0
            ? `of ${formatWhole(toDisplay(ceiling), displayCurrency)}${pct !== null ? ` · ${pct}% used` : ""}`
            : `${formatWhole(toDisplay(spent), displayCurrency)} spent · no budget set`}
        </Text>

        {/* Budget health: green until it is not. */}
        <View
          style={{
            marginTop: space.base,
            height: 3,
            borderRadius: radius.pill,
            backgroundColor: color.hairline,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.min(pct ?? 0, 100)}%`,
              height: "100%",
              borderRadius: radius.pill,
              backgroundColor:
                (pct ?? 0) > 90 ? color.danger : (pct ?? 0) > 72 ? color.warning : color.accent,
            }}
          />
        </View>
      </View>

      <Rule />

      <StatStrip
        items={[
          { label: "Income", value: <AmtShort minor={toDisplay(income)} currency={displayCurrency} tone={color.accent} size={15} /> },
          { label: "Spent", value: <AmtShort minor={toDisplay(spent)} currency={displayCurrency} size={15} /> },
          { label: "Projected", value: <AmtShort minor={toDisplay(projected)} currency={displayCurrency} size={15} tone={projected < 0 ? color.danger : color.ink} /> },
        ]}
      />

      <Rule />

      {/* ── Salary confirmation ── */}
      {pendingIncome.map((r) => (
        <View key={r.id}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/(recurring)/recurring"); }}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingHorizontal: GUTTER, paddingVertical: space.base + 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.warning }} />
              <Text style={{ ...type.body, color: color.body }}>
                {formatWhole(toDisplay(r.amountMinor), displayCurrency)} {r.label} expected
              </Text>
            </View>
            <Text style={{ ...type.action, color: color.warning }}>Not yet</Text>
          </Pressable>
          <Rule />
        </View>
      ))}

      {/* ── Spending ── */}
      {spending.length === 0 ? (
        <View style={{ padding: GUTTER }}>
          <EmptyState
            symbol="🧾"
            title="Nothing logged yet"
            body="Tap + to log your first expense. Rent, salary and subscriptions live in Recurring."
          />
        </View>
      ) : (
        <>
          <Label>Spending</Label>
          {spending.map(({ category, spent: catSpent, limit }, i) => (
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
              {i < spending.length - 1 && <Rule />}
            </View>
          ))}
          <Rule />
        </>
      )}

      {/* ── Recent ── */}
      {txns.length > 0 && (
        <>
          <Label>Recent</Label>
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
                    tone={t.kind === "income" ? color.accent : color.ink}
                  />
                </Row>
                {i < arr.length - 1 && <Rule />}
              </View>
            );
          })}
          <Rule />
        </>
      )}

      {/* ── Upcoming ── */}
      {upcoming.length > 0 && (
        <>
          <Label>Upcoming payments</Label>
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
              {i < upcoming.length - 1 && <Rule />}
            </View>
          ))}
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
