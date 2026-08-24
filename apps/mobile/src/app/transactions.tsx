import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Q } from "@nozbe/watermelondb";
import { router } from "expo-router";
import { convertMinor, FALLBACK_EMOJI } from "@budget/shared";
import { database } from "@/db";
import { useQuery } from "@/db/hooks";
import type { Category, Transaction } from "@/db/models";
import { useSpace } from "@/state/space";
import { Amt } from "@/components/amt";
import { EmptyState } from "@/components/empty-state";
import { Emoji, Label, Row, Rule, SectionCard } from "@/components/primitives";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useTheme } from "@/hooks/use-theme";
import { formatDay, monthEnd, monthStart } from "@/lib/period";
import { GUTTER, space } from "@/theme/tokens";

export default function TransactionsScreen() {
  const { color, type } = useTheme();
  const { spaceId, baseCurrency, displayCurrency, rates, canEdit } = useSpace();
  const [month, setMonth] = useState(() => monthStart());
  const start = month.getTime();
  const end = useMemo(() => monthEnd(month).getTime(), [month]);
  const current = monthStart().getTime();

  const txns = useQuery<Transaction>(
    () => database.get<Transaction>("transactions").query(
      Q.where("space_id", spaceId),
      Q.where("occurred_at", Q.gte(start)),
      Q.where("occurred_at", Q.lt(end)),
      Q.sortBy("occurred_at", Q.desc),
      Q.sortBy("created_at", Q.desc)
    ),
    [spaceId, start, end]
  );
  const categories = useQuery<Category>(
    () => database.get<Category>("categories").query(Q.where("space_id", spaceId)),
    [spaceId]
  );

  const categoryFor = (id: string) => categories.find((category) => category.id === id);
  const toDisplay = (minor: number) => baseCurrency === displayCurrency
    ? minor
    : convertMinor(minor, baseCurrency, displayCurrency, rates);
  const move = (offset: number) => setMonth(
    new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1))
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: space.huge }}
    >
      <View style={{ paddingHorizontal: GUTTER, paddingTop: space.base }}>
        <SectionCard>
          <View style={{ flexDirection: "row", alignItems: "center", padding: space.base }}>
            <Pressable accessibilityLabel="Previous month" onPress={() => move(-1)} hitSlop={12}>
              <Text style={type.action}>Previous</Text>
            </Pressable>
            <Text style={{ ...type.rowTitleLg, flex: 1, textAlign: "center", color: color.ink }}>
              {month.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })}
            </Text>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityState={{ disabled: start >= current }}
              disabled={start >= current}
              onPress={() => move(1)}
              hitSlop={12}
            >
              <Text style={{ ...type.action, color: start >= current ? color.hairline : color.accent }}>
                Next
              </Text>
            </Pressable>
          </View>
        </SectionCard>
      </View>

      <Label>Entries</Label>
      {txns.length === 0 ? (
        <SectionCard>
          <EmptyState symbol="🧾" title="No entries this month" body="Use Previous to review an earlier month." />
        </SectionCard>
      ) : (
        <SectionCard>
          {txns.map((txn, index) => {
            const category = categoryFor(txn.categoryId);
            const content = (
              <Row>
                <Emoji glyph={category?.emoji || FALLBACK_EMOJI} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...type.rowTitle, color: color.ink }} numberOfLines={1}>
                    {category?.name || "Entry"}
                  </Text>
                  <Text style={type.rowSub} numberOfLines={1}>
                    {formatDay(txn.occurredAt)}{txn.note ? ` · ${txn.note}` : ""}
                  </Text>
                </View>
                <Amt
                  minor={toDisplay(txn.kind === "income" ? txn.baseMinor : -txn.baseMinor)}
                  currency={displayCurrency}
                  size="sm"
                  signed
                  hideFraction
                  tone={txn.kind === "income" ? color.positive : color.ink}
                />
              </Row>
            );
            return (
              <View key={txn.id}>
                {canEdit ? (
                  <Pressable
                    accessibilityLabel={`Edit ${txn.note || category?.name || "entry"}`}
                    onPress={() => router.push({ pathname: "/add-expense", params: { id: txn.id } })}
                  >
                    {content}
                  </Pressable>
                ) : content}
                {index < txns.length - 1 && <Rule full />}
              </View>
            );
          })}
        </SectionCard>
      )}
    </ScrollView>
  );
}
