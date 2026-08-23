import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import { Q } from "@nozbe/watermelondb";
import { CATEGORY_COLORS, describeRecurrence, convertMinor } from "@budget/shared";
import { database } from "@/db";
import type { Category, RecurringRule } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { Money } from "@/components/money";
import { EmptyState } from "@/components/empty-state";
import { runRecurring, confirmPending, type PendingConfirmation } from "@/lib/recurring-engine";
import { formatRelativeDay } from "@/lib/period";
import { color, space, radius, type, CONTINUOUS, tint } from "@/theme/tokens";

export default function RecurringScreen() {
  const { spaceId, baseCurrency, displayCurrency, rates } = useSpace();
  const [pending, setPending] = useState<PendingConfirmation[]>([]);

  const rules = useQuery<RecurringRule>(
    () =>
      database.get<RecurringRule>("recurring_rules")
        .query(Q.where("space_id", spaceId), Q.sortBy("next_run_at", Q.asc)),
    [spaceId]
  );
  const categories = useQuery<Category>(
    () => database.get<Category>("categories").query(Q.where("space_id", spaceId)),
    [spaceId]
  );

  const refresh = useCallback(async () => {
    setPending(await runRecurring(spaceId, baseCurrency, rates));
  }, [spaceId, baseCurrency, rates]);

  useEffect(() => { void refresh(); }, [refresh, rules.length]);

  const toDisplay = (m: number, from = baseCurrency) =>
    from === displayCurrency ? m : convertMinor(m, from, displayCurrency, rates);

  const catFor = (id: string) => categories.find((c) => c.id === id);

  async function answer(p: PendingConfirmation, landed: boolean) {
    Haptics.notificationAsync(
      landed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    await confirmPending(p, baseCurrency, rates, landed);
    await refresh();
  }

  const income = rules.filter((r) => r.kind === "income");
  const expenses = rules.filter((r) => r.kind === "expense");

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: 140 }}
    >
      {pending.map((p) => {
        const c = catFor(p.rule.categoryId);
        return (
          <View
            key={`${p.rule.id}-${p.occurredAt}`}
            style={{
              backgroundColor: color.ink, borderRadius: radius.card, ...CONTINUOUS,
              padding: space.lg, gap: space.md,
            }}
          >
            <Text style={{ ...type.micro, color: color.onInkMuted }}>
              {formatRelativeDay(new Date(p.occurredAt))} · expected
            </Text>
            <Text style={{ ...type.heading, color: color.onInk }}>{p.rule.label}</Text>
            <Money
              minor={toDisplay(p.rule.amountMinor, p.rule.currency)}
              currency={displayCurrency}
              size="figure"
              tone={p.rule.kind === "income" ? color.highlight : color.onInk}
            />
            <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.xs }}>
              <Pressable
                onPress={() => answer(p, true)}
                style={{
                  flex: 1, paddingVertical: 11, borderRadius: radius.pill,
                  backgroundColor: color.accent, alignItems: "center",
                }}
              >
                <Text style={{ ...type.label, fontWeight: "600", color: color.onAccent }}>
                  Landed
                </Text>
              </Pressable>
              <Pressable
                onPress={() => answer(p, false)}
                style={{
                  flex: 1, paddingVertical: 11, borderRadius: radius.pill,
                  backgroundColor: "#FFFFFF1A", alignItems: "center",
                }}
              >
                <Text style={{ ...type.label, fontWeight: "600", color: color.onInk }}>
                  Not yet
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ ...type.heading, color: color.ink }}>Scheduled</Text>
        <Link href="/recurring-rule" asChild>
          <Pressable hitSlop={10}>
            <Text style={{ ...type.label, color: color.accent, fontWeight: "600" }}>Add</Text>
          </Pressable>
        </Link>
      </View>

      {rules.length === 0 ? (
        <EmptyState
          symbol="repeat"
          title="No recurring items"
          body="Add your salary on the 25th, rent on the 1st, and your subscriptions. Salary defaults to asking whether it landed, because it can be late."
        />
      ) : (
        <>
          <Section title="Income" rules={income} catFor={catFor} toDisplay={toDisplay}
                   currency={displayCurrency} />
          <Section title="Outgoings" rules={expenses} catFor={catFor} toDisplay={toDisplay}
                   currency={displayCurrency} />
        </>
      )}
    </ScrollView>
  );
}

function Section({
  title, rules, catFor, toDisplay, currency,
}: {
  title: string;
  rules: RecurringRule[];
  catFor: (id: string) => Category | undefined;
  toDisplay: (m: number, from?: Parameters<typeof Money>[0]["currency"]) => number;
  currency: Parameters<typeof Money>[0]["currency"];
}) {
  if (rules.length === 0) return null;

  return (
    <View style={{ gap: space.sm }}>
      <Text style={{ ...type.micro, color: color.muted }}>{title}</Text>
      {rules.map((r) => {
        const c = catFor(r.categoryId);
        const base = c ? CATEGORY_COLORS[c.colorKey] : color.muted;
        return (
          <View
            key={r.id}
            style={{
              flexDirection: "row", alignItems: "center", gap: space.md,
              backgroundColor: color.card, borderRadius: radius.row, ...CONTINUOUS,
              padding: space.base, opacity: r.active ? 1 : 0.5,
            }}
          >
            <View
              style={{
                width: 40, height: 40, borderRadius: radius.chip, ...CONTINUOUS,
                backgroundColor: tint(base), alignItems: "center", justifyContent: "center",
              }}
            >
              <Image source={`sf:${c?.symbol ?? "repeat"}`} tintColor={base}
                     style={{ width: 20, height: 20 }} />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ ...type.body, color: color.ink }}>{r.label}</Text>
              <Text style={{ ...type.caption, color: color.muted }}>
                {describeRecurrence({
                  freq: r.freq, dayOfMonth: r.dayOfMonth, weekday: r.weekday,
                  interval: r.interval, startOn: r.startOn.getTime(),
                })}
                {r.autoPost ? "" : " · confirms"}
              </Text>
            </View>

            <Money
              minor={toDisplay(r.amountMinor, r.currency)}
              currency={currency}
              size="row"
              hideFraction
              tone={r.kind === "income" ? color.positive : color.ink}
            />
          </View>
        );
      })}
    </View>
  );
}
