import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { RecurringRule } from "@/db/models";
import type { Prefs } from "@/state/prefs";
import { recurringReminderDate } from "@/lib/reminder-date";

export { recurringReminderDate } from "@/lib/reminder-date";

const CHANNEL_ID = "kobo-reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function ensureReminderPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function reminderPermissionGranted(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

export function formatReminderTime(hour: number, minute: number): string {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

type ReminderPrefs = Pick<
  Prefs,
  | "dailyReminderEnabled"
  | "recurringReminderEnabled"
  | "reminderHour"
  | "reminderMinute"
  | "recurringReminderDaysBefore"
>;

export async function syncReminders(rules: RecurringRule[], prefs: ReminderPrefs) {
  await ensureChannel();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.koboManaged === true)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );

  if (!prefs.dailyReminderEnabled && !prefs.recurringReminderEnabled) return;
  if (!(await reminderPermissionGranted())) return;

  if (prefs.dailyReminderEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Quick money check-in",
        body: "Add anything you spent today while it is still fresh.",
        sound: "default",
        data: { koboManaged: true, href: "/" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prefs.reminderHour,
        minute: prefs.reminderMinute,
        channelId: CHANNEL_ID,
      },
    });
  }

  if (!prefs.recurringReminderEnabled) return;
  const now = Date.now();
  // ponytail: iOS keeps 64 pending notifications; one daily + 50 rules leaves headroom.
  const upcoming = rules
    .filter((rule) => rule.active)
    .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())
    .slice(0, 50);

  await Promise.all(
    upcoming.map(async (rule) => {
      const date = recurringReminderDate(
        rule.nextRunAt,
        prefs.recurringReminderDaysBefore,
        prefs.reminderHour,
        prefs.reminderMinute
      );
      if (date.getTime() <= now) return;
      const when = prefs.recurringReminderDaysBefore === 0
        ? "today"
        : prefs.recurringReminderDaysBefore === 1
          ? "tomorrow"
          : `in ${prefs.recurringReminderDaysBefore} days`;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${rule.label} is due ${when}`,
          body: "Open Kobo Tracker to review it.",
          sound: "default",
          data: { koboManaged: true, href: "/recurring" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: CHANNEL_ID,
        },
      });
    })
  );
}

export async function scheduleTestReminder() {
  if (!(await ensureReminderPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Kobo Tracker reminders are on",
      body: "You will get a nudge at the time you chose.",
      sound: "default",
      data: { href: "/reminders" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}
