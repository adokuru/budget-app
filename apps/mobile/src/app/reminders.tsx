import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Label, Rule } from "@/components/primitives";
import { SettingsToggleRow } from "@/components/settings-row";
import {
  ensureReminderPermission,
  formatReminderTime,
  reminderPermissionGranted,
  scheduleTestReminder,
} from "@/lib/reminders";
import { usePrefs } from "@/state/prefs";
import { color, CONTINUOUS, GUTTER, radius, space, type } from "@/theme/tokens";

export default function RemindersScreen() {
  const prefs = usePrefs();
  const [permission, setPermission] = useState(false);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  useEffect(() => {
    void reminderPermissionGranted().then(setPermission);
  }, []);

  const enable = async (setter: (value: boolean) => void) => {
    const granted = await ensureReminderPermission();
    setPermission(granted);
    if (granted) return setter(true);
    Alert.alert(
      "Notifications are off",
      "Allow notifications in Settings to use reminders.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ]
    );
  };

  const time = new Date(2000, 0, 1, prefs.reminderHour, prefs.reminderMinute);
  const timePicker = (
    <DateTimePicker
      value={time}
      mode="time"
      display={Platform.OS === "ios" ? "compact" : "default"}
      onChange={(_, value) => {
        setShowAndroidPicker(false);
        if (value) prefs.setReminderTime(value.getHours(), value.getMinutes());
      }}
    />
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: space.huge }}
    >
      <Label>Status</Label>
      <View style={rowStyle}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.rowTitleLg, color: color.ink }}>Notifications</Text>
          <Text style={type.rowSub}>{permission ? "Allowed on this device" : "Not allowed yet"}</Text>
        </View>
        {!permission && (
          <Pressable onPress={() => void Linking.openSettings()} hitSlop={10}>
            <Text style={type.action}>Settings</Text>
          </Pressable>
        )}
      </View>

      <Label>Reminders</Label>
      <SettingsToggleRow
        label="Daily check-in"
        sub="An evening nudge to add anything you spent today."
        value={prefs.dailyReminderEnabled}
        onChange={(value) => value ? void enable(prefs.setDailyReminderEnabled) : prefs.setDailyReminderEnabled(false)}
      />
      <Rule />
      <SettingsToggleRow
        label="Recurring items"
        sub="A heads-up before rent, subscriptions, salary and other scheduled items."
        value={prefs.recurringReminderEnabled}
        onChange={(value) => value ? void enable(prefs.setRecurringReminderEnabled) : prefs.setRecurringReminderEnabled(false)}
      />

      {(prefs.dailyReminderEnabled || prefs.recurringReminderEnabled) && (
        <>
          <Label>Schedule</Label>
          <View style={rowStyle}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...type.rowTitleLg, color: color.ink }}>Reminder time</Text>
              <Text style={type.rowSub}>Uses this device&apos;s local time.</Text>
            </View>
            {Platform.OS === "ios" ? timePicker : (
              <Pressable onPress={() => setShowAndroidPicker(true)} style={chipStyle}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: color.ink }}>
                  {formatReminderTime(prefs.reminderHour, prefs.reminderMinute)}
                </Text>
              </Pressable>
            )}
          </View>
          {showAndroidPicker && timePicker}
        </>
      )}

      {prefs.recurringReminderEnabled && (
        <>
          <Rule />
          <View style={{ ...rowStyle, alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingTop: 8 }}>
              <Text style={{ ...type.rowTitleLg, color: color.ink }}>Remind me</Text>
              <Text style={type.rowSub}>Before each recurring item is due.</Text>
            </View>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              {[0, 1, 3].map((days) => {
                const selected = prefs.recurringReminderDaysBefore === days;
                return (
                  <Pressable
                    key={days}
                    onPress={() => prefs.setRecurringReminderDaysBefore(days)}
                    style={{
                      ...chipStyle,
                      backgroundColor: selected ? color.ink : color.chip,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: selected ? color.onAccent : color.body }}>
                      {days === 0 ? "Due" : `${days}d`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}

      <Label>Check</Label>
      <Pressable
        onPress={() => void scheduleTestReminder().then((sent) => {
          setPermission(sent);
          if (sent) Alert.alert("Test scheduled", "It should arrive in about five seconds.");
        })}
        style={({ pressed }) => ({ ...rowStyle, backgroundColor: pressed ? color.pressed : color.canvas })}
      >
        <Text style={{ ...type.rowTitleLg, fontWeight: "600", color: color.accent }}>
          Send a test reminder
        </Text>
      </Pressable>
      <Rule />
    </ScrollView>
  );
}

const rowStyle = {
  minHeight: 54,
  flexDirection: "row",
  alignItems: "center",
  gap: space.md,
  paddingHorizontal: GUTTER,
  paddingVertical: space.md,
} as const;

const chipStyle = {
  ...CONTINUOUS,
  borderRadius: radius.chip,
  backgroundColor: color.chip,
  paddingHorizontal: space.md,
  paddingVertical: 9,
} as const;
