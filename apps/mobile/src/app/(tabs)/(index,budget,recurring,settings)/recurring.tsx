import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { Q } from "@nozbe/watermelondb";
import {
  sumMinor, convertMinor, describeRecurrence, formatWhole, FALLBACK_EMOJI,
} from "@budget/shared";
import { database } from "@/db";
import type { Category, RecurringRule } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { Amt } from "@/components/amt";
import { AppHeader } from "@/components/app-header";
import { Rule, Label, EmojiPlain, Row } from "@/components/primitives";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast";
import { runRecurring, confirmPending, type PendingConfirmation } from "@/lib/recurring-engine";
import { formatRelativeDay } from "@/lib/period";
import { color, space, GUTTER, radius, type, CONTINUOUS } from "@/theme/tokens";

export default function RecurringScreen() {
  const { spaceId, baseCurrency, displayCurrency, rates, space: current, isShared } = useSpace();
  const { show } = useToast();
  const [pending, setPending] = useState<PendingConfirmation[]>([]);

  const rules = useQuery<RecurringRule>(
    () => database.get<RecurringRule>("recurring_rules")
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
    show(landed ? "Marked as received" : "Left pending", {
      tone: landed ? "success" : "info",
    });
  }

  const outgoings = rules.filter((r) => r.kind === "expense");
  const incomes = rules.filter((r) => r.kind === "income");
  const commitment = sumMinor(outgoings.map((r) => r.amountMinor));

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      <AppHeader spaceName={current.name} isShared={isShared} />

      <View style={{ paddingHorizontal: GUTTER, paddingTop: space.base, paddingBottom: space.xl }}>
        <Text style={{ ...type.eyebrow, marginBottom: space.sm }}>Monthly commitments</Text>
        <Amt minor={toDisplay(commitment)} currency={displayCurrency} size="xl" />
        <Text style={{ ...type.meta, marginTop: space.sm }}>
          {outgoings.length} {outgoings.length === 1 ? "payment" : "payments"} scheduled
        </Text>
      </View>

      <Rule />

      {/* Anything due that needs a yes or no gets asked first. */}
      {pending.length > 0 && (
        <>
          <Label>Confirm</Label>
          {pending.map((p, i) => (
            <View key={`${p.rule.id}-${p.occurredAt}`}>
              <View style={{ paddingHorizontal: GUTTER, paddingVertical: space.base }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <EmojiPlain glyph={catFor(p.rule.categoryId)?.emoji || FALLBACK_EMOJI} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ ...type.rowTitle, color: color.ink }}>{p.rule.label}</Text>
                    <Text style={type.rowSub}>
                      {formatRelativeDay(new Date(p.occurredAt))} · expected
                    </Text>
                  </View>
                  <Amt
                    minor={toDisplay(p.rule.amountMinor, p.rule.currency)}
                    currency={displayCurrency}
                    size="sm"
                    hideFraction
                    signed={p.rule.kind === "income"}
                    tone={p.rule.kind === "income" ? color.accent : color.ink}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md, paddingLeft: 40 }}>
                  <Pressable
                    onPress={() => answer(p, true)}
                    style={{
                      flex: 1, paddingVertical: 9, borderRadius: radius.chip, ...CONTINUOUS,
                      alignItems: "center", backgroundColor: color.accent,
                    }}
                  >
                    <Text style={{ ...type.body, fontWeight: "700", color: color.onAccent }}>Landed</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => answer(p, false)}
                    style={{
                      flex: 1, paddingVertical: 9, borderRadius: radius.chip, ...CONTINUOUS,
                      alignItems: "center", borderWidth: 1, borderColor: color.hairline,
                    }}
                  >
                    <Text style={{ ...type.body, fontWeight: "600", color: color.body }}>Not yet</Text>
                  </Pressable>
                </View>
              </View>
              {i < pending.length - 1 ? <Rule /> : null}
            </View>
          ))}
          <Rule />
        </>
      )}

      {rules.length === 0 ? (
        <EmptyState
          symbol="🔁"
          title="No recurring items"
          body="Add your salary on the 25th, rent on the 1st, and your subscriptions. Salary defaults to asking whether it landed, because it can be late."
          action={{ label: "Add one", href: "/recurring-rule" }}
        />
      ) : (
        <>
          {incomes.length > 0 && (
            <>
              <Label>Income</Label>
              {incomes.map((r, i) => (
                <View key={r.id}>
                  <RuleRow
                    rule={r}
                    emoji={catFor(r.categoryId)?.emoji}
                    minor={toDisplay(r.amountMinor, r.currency)}
                    currency={displayCurrency}
                  />
                  {i < incomes.length - 1 && <Rule />}
                </View>
              ))}
              <Rule />
            </>
          )}

          <Label
            action={
              <Link href="/recurring-rule" asChild>
                <Pressable hitSlop={10}>
                  <Text style={type.action}>Add</Text>
                </Pressable>
              </Link>
            }
          >
            Upcoming
          </Label>
          {outgoings.map((r, i) => (
            <View key={r.id}>
              <RuleRow
                rule={r}
                emoji={catFor(r.categoryId)?.emoji}
                minor={toDisplay(r.amountMinor, r.currency)}
                currency={displayCurrency}
              />
              {i < outgoings.length - 1 && <Rule />}
            </View>
          ))}

          <Rule />
          <View
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingHorizontal: GUTTER, paddingVertical: space.lg,
            }}
          >
            <Text style={type.meta}>After all commitments</Text>
            <Text style={{ ...type.body, fontWeight: "700", color: color.accent }}>
              {formatWhole(
                toDisplay(sumMinor(incomes.map((r) => r.amountMinor)) - commitment),
                displayCurrency
              )}{" "}
              free
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function RuleRow({
  rule, emoji, minor, currency,
}: {
  rule: RecurringRule;
  emoji?: string;
  minor: number;
  currency: Parameters<typeof Amt>[0]["currency"];
}) {
  const isIncome = rule.kind === "income";
  return (
    <Row>
      <EmojiPlain glyph={emoji || FALLBACK_EMOJI} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...type.rowTitle, color: color.ink }} numberOfLines={1}>{rule.label}</Text>
        <Text style={type.rowSub} numberOfLines={1}>
          {formatRelativeDay(rule.nextRunAt)} ·{" "}
          {describeRecurrence({
            freq: rule.freq, dayOfMonth: rule.dayOfMonth, weekday: rule.weekday,
            interval: rule.interval, startOn: rule.startOn.getTime(),
          })}
          {rule.autoPost ? "" : " · confirms"}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Amt minor={minor} currency={currency} size="sm" hideFraction signed={isIncome}
             tone={isIncome ? color.accent : color.ink} />
        {isIncome && rule.lastRunAt && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Image source="sf:checkmark" tintColor={color.accent} style={{ width: 8, height: 8 }} />
            <Text style={{ fontSize: 10, fontWeight: "700", color: color.accent }}>Received</Text>
          </View>
        )}
      </View>
    </Row>
  );
}
