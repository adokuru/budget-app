import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { Q } from "@nozbe/watermelondb";
import { sumMinor, convertMinor, CATEGORY_COLORS } from "@budget/shared";
import { database } from "@/db";
import type { Category, Transaction } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { AnimatedMoney } from "@/components/animated-money";
import { CategoryRow } from "@/components/category-row";
import { Money } from "@/components/money";
import { EmptyState } from "@/components/empty-state";
import { monthStart } from "@/lib/period";
import { color, space, radius, type, CONTINUOUS, shadow } from "@/theme/tokens";

export default function HomeScreen() {
  const { spaceId, baseCurrency, displayCurrency, rates } = useSpace();
  const since = useMemo(() => monthStart().getTime(), []);

  const txns = useQuery<Transaction>(
    () =>
      database
        .get<Transaction>("transactions")
        .query(Q.where("space_id", spaceId), Q.where("occurred_at", Q.gte(since))),
    [spaceId, since]
  );

  const categories = useQuery<Category>(
    () => database.get<Category>("categories").query(Q.where("space_id", spaceId)),
    [spaceId]
  );

  // Reports read base_minor, the value frozen at entry time, so a naira move
  // never silently re-prices last month.
  const income = sumMinor(txns.filter((t) => t.kind === "income").map((t) => t.baseMinor));
  const spent = sumMinor(txns.filter((t) => t.kind === "expense").map((t) => t.baseMinor));
  const leftBase = income - spent;

  const toDisplay = (m: number) =>
    baseCurrency === displayCurrency ? m : convertMinor(m, baseCurrency, displayCurrency, rates);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of txns) {
      if (t.kind !== "expense") continue;
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.baseMinor);
    }
    return categories
      .filter((c) => totals.has(c.id))
      .map((c) => ({ category: c, total: totals.get(c.id)! }))
      .sort((a, b) => b.total - a.total);
  }, [txns, categories]);

  return (
    <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: color.canvas }}
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 120 }}
      >
        <View
          style={{
            backgroundColor: color.ink,
            borderRadius: radius.card,
            ...CONTINUOUS,
            ...shadow.lifted,
            padding: space.xl,
            gap: space.sm,
          }}
        >
          <Text style={{ ...type.micro, color: color.muted }}>Left to spend</Text>
          <AnimatedMoney
            minor={toDisplay(leftBase)}
            currency={displayCurrency}
            tone={leftBase < 0 ? color.danger : color.onInk}
          />
          <View style={{ flexDirection: "row", gap: space.lg, marginTop: space.sm }}>
            <Stat label="In" minor={toDisplay(income)} currency={displayCurrency} tone={color.accent} />
            <Stat label="Out" minor={toDisplay(spent)} currency={displayCurrency} tone={color.muted} />
          </View>
        </View>

        {byCategory.length === 0 ? (
          <EmptyState
            symbol="tray"
            title="Nothing logged yet"
            body="Tap + to add your first expense. Recurring items like rent and salary live in the Recurring tab."
          />
        ) : (
          <>
            <Text style={{ ...type.heading, color: color.ink }}>Where it went</Text>
            <View style={{ gap: space.sm }}>
              {byCategory.map(({ category, total }, i) => (
                <CategoryRow
                  key={category.id}
                  index={i}
                  name={category.name}
                  colorKey={category.colorKey}
                  symbol={category.symbol}
                  spentMinor={toDisplay(total)}
                  currency={displayCurrency}
                />
              ))}
            </View>
          </>
        )}
    </ScrollView>
  );
}

function Stat({
  label, minor, currency, tone,
}: { label: string; minor: number; currency: Parameters<typeof Money>[0]["currency"]; tone: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ ...type.micro, color: color.muted }}>{label}</Text>
      <Money minor={minor} currency={currency} size="row" tone={tone} hideFraction />
    </View>
  );
}
