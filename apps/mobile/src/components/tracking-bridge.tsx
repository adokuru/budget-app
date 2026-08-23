import { useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { Q } from "@nozbe/watermelondb";
import { convertMinor, formatWhole, sumMinor } from "@budget/shared";
import { database } from "@/db";
import { useQuery } from "@/db/hooks";
import type { Budget, RecurringRule, Transaction } from "@/db/models";
import { monthStart } from "@/lib/period";
import { syncReminders } from "@/lib/reminders";
import { usePrefs } from "@/state/prefs";
import { useSpace } from "@/state/space";
import { BudgetProgressWidget } from "@/widgets/budget-progress";

export function TrackingBridge() {
  const router = useRouter();
  const prefs = usePrefs();
  const {
    dailyReminderEnabled,
    recurringReminderEnabled,
    reminderHour,
    reminderMinute,
    recurringReminderDaysBefore,
  } = prefs;
  const { spaceId, baseCurrency, displayCurrency, rates } = useSpace();
  const since = useMemo(() => monthStart().getTime(), []);

  const rules = useQuery<RecurringRule>(
    () => database.get<RecurringRule>("recurring_rules").query(Q.where("space_id", spaceId)),
    [spaceId]
  );
  const txns = useQuery<Transaction>(
    () => database.get<Transaction>("transactions").query(
      Q.where("space_id", spaceId),
      Q.where("kind", "expense"),
      Q.where("occurred_at", Q.gte(since))
    ),
    [spaceId, since]
  );
  const budgets = useQuery<Budget>(
    () => database.get<Budget>("budgets").query(
      Q.where("space_id", spaceId),
      Q.where("period_start", since)
    ),
    [spaceId, since]
  );

  useEffect(() => {
    void syncReminders(rules, {
      dailyReminderEnabled,
      recurringReminderEnabled,
      reminderHour,
      reminderMinute,
      recurringReminderDaysBefore,
    }).catch((error) => console.warn("Reminder sync failed", error));
  }, [rules, dailyReminderEnabled, recurringReminderEnabled, reminderHour,
    reminderMinute, recurringReminderDaysBefore]);

  useEffect(() => {
    const response = Notifications.getLastNotificationResponse();
    if (!response) return;
    const href = response.notification.request.content.data?.href;
    if (typeof href === "string") router.push(href as never);
    Notifications.clearLastNotificationResponse();
  }, [router]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const href = response.notification.request.content.data?.href;
      if (typeof href === "string") router.push(href as never);
      Notifications.clearLastNotificationResponse();
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    const totalSpent = sumMinor(txns.map((txn) => txn.baseMinor));
    const budgeted = sumMinor(budgets.map((budget) => budget.amountMinor));
    const toDisplay = (minor: number) => baseCurrency === displayCurrency
      ? minor
      : convertMinor(minor, baseCurrency, displayCurrency, rates);
    const remaining = budgeted - totalSpent;
    BudgetProgressWidget.updateSnapshot({
      month: new Date(since).toLocaleDateString(undefined, { month: "long" }),
      budget: formatWhole(toDisplay(budgeted), displayCurrency),
      spent: formatWhole(toDisplay(totalSpent), displayCurrency),
      remaining: formatWhole(toDisplay(remaining), displayCurrency),
      progress: budgeted > 0 ? Math.min(totalSpent / budgeted, 1) : 0,
      hasBudget: budgeted > 0,
    });
  }, [baseCurrency, budgets, displayCurrency, rates, since, txns]);

  return null;
}
