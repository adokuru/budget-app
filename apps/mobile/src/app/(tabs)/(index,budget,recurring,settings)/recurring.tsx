import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { Q } from "@nozbe/watermelondb";
import {
  sumMinor, convertMinor, describeRecurrence, formatWhole, utcDay, FALLBACK_EMOJI,
} from "@budget/shared";
import { database } from "@/db";
import type { Category, RecurringRule, Transaction } from "@/db/models";
import { useQueryState } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { Amt } from "@/components/amt";
import { AppHeader } from "@/components/app-header";
import { Rule, Label, EmojiPlain, Row, ScreenLoading, SectionCard } from "@/components/primitives";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/toast";
import { useTheme } from "@/hooks/use-theme";
import { runRecurring, confirmPending, type PendingConfirmation } from "@/lib/recurring-engine";
import { formatRelativeDay } from "@/lib/period";
import { syncQuietly } from "@/lib/sync";
import { space, GUTTER, radius, CONTINUOUS } from "@/theme/tokens";

export default function RecurringScreen() {
  const { color, type } = useTheme();
  const { spaceId, baseCurrency, displayCurrency, rates, space: current, isShared, canEdit } = useSpace();
  const { show } = useToast();
  const [pending, setPending] = useState<PendingConfirmation[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  const ruleState = useQueryState<RecurringRule>(
    () => database.get<RecurringRule>("recurring_rules")
      .query(Q.where("space_id", spaceId), Q.sortBy("next_run_at", Q.asc)),
    [spaceId]
  );
  const categoryState = useQueryState<Category>(
    () => database.get<Category>("categories").query(Q.where("space_id", spaceId)),
    [spaceId]
  );
  const receivedState = useQueryState<Transaction>(
    () => database.get<Transaction>("transactions").query(
      Q.where("space_id", spaceId),
      Q.where("kind", "income"),
      Q.where("recurring_rule_id", Q.notEq(null))
    ),
    [spaceId]
  );

  const rules = ruleState.rows;
  const categories = categoryState.rows;
  const received = receivedState.rows;

  const refresh = useCallback(async () => {
    setPending(await runRecurring(spaceId, baseCurrency, rates));
  }, [spaceId, baseCurrency, rates]);

  const rulesRevision = rules.map((rule) => [
    rule.id, rule.active, rule.kind, rule.categoryId, rule.amountMinor, rule.freq,
    rule.dayOfMonth, rule.weekday, rule.startOn.getTime(), rule.lastRunAt?.getTime(), rule.autoPost,
  ].join(":")).join("|");
  useEffect(() => { void refresh(); }, [refresh, rulesRevision]);

  const toDisplay = (m: number, from = baseCurrency) =>
    from === displayCurrency ? m : convertMinor(m, from, displayCurrency, rates);

  const catFor = (id: string) => categories.find((c) => c.id === id);

  async function confirm(p: PendingConfirmation) {
    const key = `${p.rule.id}-${p.occurredAt}`;
    if (confirming) return;
    setConfirming(key);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await confirmPending(p, baseCurrency, rates);
      await refresh();
      syncQuietly();
      show(p.rule.kind === "income" ? "Added to this month’s income" : "Added to this month’s spending", {
        tone: "success",
      });
    } catch (error) {
      show(error instanceof Error ? error.message : "Could not add this recurring item", { tone: "error" });
    } finally {
      setConfirming(null);
    }
  }

  function keepPending(p: PendingConfirmation) {
    Haptics.selectionAsync();
    show(`${p.rule.label} is still pending`, { tone: "info" });
  }

  const outgoings = rules.filter((r) => r.kind === "expense");
  const incomes = rules.filter((r) => r.kind === "income");
  const activeOutgoings = outgoings.filter((rule) => rule.active);
  const activeIncomes = incomes.filter((rule) => rule.active);
  const commitment = sumMinor(activeOutgoings.map((r) => r.amountMinor));

  if (ruleState.loading || categoryState.loading || receivedState.loading) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: color.canvas }}>
        <AppHeader spaceName={current.name} isShared={isShared} />
        <ScreenLoading label="Loading recurring items" />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      <AppHeader spaceName={current.name} isShared={isShared} />

      <View style={{ marginHorizontal: GUTTER, marginTop: space.sm, padding: space.lg, backgroundColor: color.surfaceStrong }}>
        <Text style={{ ...type.eyebrow, color: color.brandLime, marginBottom: space.sm }}>Monthly bills</Text>
        <Amt minor={toDisplay(commitment)} currency={displayCurrency} size="xl" tone={color.onStrong} />
        <Text style={{ ...type.meta, color: "#FFFFFFB8", marginTop: space.sm }}>
          {activeOutgoings.length} {activeOutgoings.length === 1 ? "payment" : "payments"} scheduled
        </Text>
      </View>

      {/* Anything due that needs a yes or no gets asked first. */}
      {canEdit && pending.length > 0 && (
        <>
          <Label>Needs confirmation</Label>
          <SectionCard>
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
                      tone={p.rule.kind === "income" ? color.positive : color.ink}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md, paddingLeft: 40 }}>
                    <Pressable
                      accessibilityLabel={p.rule.kind === "income" ? "Mark as received" : "Mark as paid"}
                      onPress={() => void confirm(p)}
                      disabled={confirming !== null}
                      style={{
                        flex: 1, minHeight: 48, borderRadius: radius.chip, ...CONTINUOUS,
                        alignItems: "center", justifyContent: "center", backgroundColor: color.positive,
                      }}
                    >
                      <Text style={{ ...type.body, fontWeight: "700", color: color.onPositive }}>
                        {confirming === `${p.rule.id}-${p.occurredAt}`
                          ? "Adding…"
                          : p.rule.kind === "income" ? "Received" : "Paid"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Keep this recurring item pending"
                      onPress={() => keepPending(p)}
                      style={{
                        flex: 1, minHeight: 48, borderRadius: radius.chip, ...CONTINUOUS,
                        alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.hairline,
                      }}
                    >
                      <Text style={{ ...type.body, fontWeight: "600", color: color.body }}>Still waiting</Text>
                    </Pressable>
                  </View>
                </View>
                {i < pending.length - 1 ? <Rule full /> : null}
              </View>
            ))}
          </SectionCard>
        </>
      )}

      {rules.length === 0 ? (
        <SectionCard style={{ marginTop: space.lg }}>
          <EmptyState
            symbol="🔁"
            title="No recurring items"
            body="Add regular income and bills, such as salary, rent and subscriptions. For income, Kobo Tracker can ask you before adding it."
            action={canEdit ? { label: "Add one", href: "/recurring-rule" } : undefined}
          />
        </SectionCard>
      ) : (
        <>
          {incomes.length > 0 && (
            <>
              <Label>Income</Label>
              <SectionCard>
                {incomes.map((r, i) => (
                  <View key={r.id}>
                    <RuleRow
                      rule={r}
                      emoji={catFor(r.categoryId)?.emoji}
                      minor={toDisplay(r.amountMinor, r.currency)}
                      currency={displayCurrency}
                      received={Boolean(r.lastRunAt && received.some((txn) =>
                        txn.recurringRuleId === r.id &&
                        utcDay(txn.occurredAt.getTime()) === utcDay(r.lastRunAt!.getTime())
                      ))}
                    />
                    {i < incomes.length - 1 && <Rule full />}
                  </View>
                ))}
              </SectionCard>
            </>
          )}

          <Label
            action={canEdit ? (
              <Link href="/recurring-rule" asChild>
                <Pressable hitSlop={10}>
                  <Text style={type.action}>Add</Text>
                </Pressable>
              </Link>
            ) : undefined}
          >
            Upcoming
          </Label>
          <SectionCard>
            {outgoings.map((r, i) => (
              <View key={r.id}>
                <RuleRow
                  rule={r}
                  emoji={catFor(r.categoryId)?.emoji}
                  minor={toDisplay(r.amountMinor, r.currency)}
                  currency={displayCurrency}
                />
                {i < outgoings.length - 1 && <Rule full />}
              </View>
            ))}
            {outgoings.length > 0 && <Rule full />}
            <View
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                paddingHorizontal: GUTTER, paddingVertical: space.lg,
                backgroundColor: color.brandLime,
              }}
            >
              <Text style={{ ...type.meta, color: color.onBrand }}>Expected after bills</Text>
              <Text style={{ ...type.body, fontWeight: "800", color: color.onBrand }}>
                {formatWhole(
                  toDisplay(sumMinor(activeIncomes.map((r) => r.amountMinor)) - commitment),
                  displayCurrency
                )}{" "}
                left
              </Text>
            </View>
          </SectionCard>
        </>
      )}
    </ScrollView>
  );
}

function RuleRow({
  rule, emoji, minor, currency, received = false,
}: {
  rule: RecurringRule;
  emoji?: string;
  minor: number;
  currency: Parameters<typeof Amt>[0]["currency"];
  received?: boolean;
}) {
  const { color, type } = useTheme();
  const { canEdit } = useSpace();
  const isIncome = rule.kind === "income";
  const status = !rule.active ? "Paused" : !rule.autoPost ? "Needs confirmation" : null;
  const content = (
    <Row>
      <EmojiPlain glyph={emoji || FALLBACK_EMOJI} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...type.rowTitle, color: color.ink }} numberOfLines={1}>{rule.label}</Text>
        <Text style={type.rowSub} numberOfLines={2}>
          {formatRelativeDay(rule.nextRunAt)} ·{" "}
          {describeRecurrence({
            freq: rule.freq, dayOfMonth: rule.dayOfMonth, weekday: rule.weekday,
            interval: rule.interval, startOn: rule.startOn.getTime(),
          })}
        </Text>
        {status && <Text style={{ ...type.rowSub, fontWeight: "700", color: color.faint }}>{status}</Text>}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Amt minor={minor} currency={currency} size="sm" hideFraction signed={isIncome}
             tone={isIncome ? color.positive : color.ink} />
        {isIncome && received && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Image source="sf:checkmark" tintColor={color.positive} style={{ width: 8, height: 8 }} />
            <Text style={{ fontSize: 10, fontWeight: "700", color: color.positive }}>Received</Text>
          </View>
        )}
      </View>
    </Row>
  );
  return canEdit ? (
    <Pressable
      accessibilityLabel={`Edit recurring item ${rule.label}${rule.active ? "" : ", Paused"}`}
      onPress={() => router.push({ pathname: "/recurring-rule", params: { id: rule.id } })}
    >
      {content}
    </Pressable>
  ) : content;
}
