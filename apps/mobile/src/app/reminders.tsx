import { useEffect, useState } from "react";
import { Alert, Linking, Platform, ScrollView, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Label, Rule, SectionCard } from "@/components/primitives";
import { SettingsToggleRow } from "@/components/settings-row";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useToast } from "@/components/toast";
import {
  ensureReminderPermission,
  formatReminderTime,
  reminderPermissionGranted,
  scheduleTestReminder,
} from "@/lib/reminders";
import { usePrefs } from "@/state/prefs";
import { useTheme } from "@/hooks/use-theme";
import { CONTINUOUS, GUTTER, radius, space } from "@/theme/tokens";

export default function RemindersScreen() {
  const { color, type, scheme } = useTheme();
  const prefs = usePrefs();
  const { show } = useToast();
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
      themeVariant={scheme}
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
      <SectionCard>
        <View style={rowStyle}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...type.rowTitleLg, color: color.ink }}>Notifications</Text>
            <Text style={type.rowSub}>{permission ? "Allowed on this phone" : "Not allowed on this phone"}</Text>
          </View>
          {!permission && (
            <Pressable onPress={() => void Linking.openSettings()} hitSlop={10}>
              <Text style={type.action}>Settings</Text>
            </Pressable>
          )}
        </View>
      </SectionCard>

      <Label>Reminders</Label>
      <SectionCard>
        <SettingsToggleRow
          label="Daily check-in"
          sub="Remind me to add what I spent today."
          value={prefs.dailyReminderEnabled}
          onChange={(value) => value ? void enable(prefs.setDailyReminderEnabled) : prefs.setDailyReminderEnabled(false)}
        />
        <Rule full />
        <SettingsToggleRow
          label="Recurring items"
          sub="Remind me before recurring income and bills are due."
          value={prefs.recurringReminderEnabled}
          onChange={(value) => value ? void enable(prefs.setRecurringReminderEnabled) : prefs.setRecurringReminderEnabled(false)}
        />
      </SectionCard>

      {(prefs.dailyReminderEnabled || prefs.recurringReminderEnabled) && (
        <>
          <Label>Schedule</Label>
          <SectionCard>
            <View style={rowStyle}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...type.rowTitleLg, color: color.ink }}>Reminder time</Text>
                <Text style={type.rowSub}>Uses your phone&apos;s local time.</Text>
              </View>
              {Platform.OS === "ios" ? timePicker : (
                <Pressable
                  onPress={() => setShowAndroidPicker(true)}
                  style={{ ...chipStyle, backgroundColor: color.chip }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: color.ink }}>
                    {formatReminderTime(prefs.reminderHour, prefs.reminderMinute)}
                  </Text>
                </Pressable>
              )}
            </View>
            {prefs.recurringReminderEnabled && (
              <>
                <Rule full />
                <View style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch" }}>
                  <View>
                    <Text style={{ ...type.rowTitleLg, color: color.ink }}>Reminder date</Text>
                    <Text style={type.rowSub}>Choose how early to be reminded.</Text>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                    {[0, 1, 3].map((days) => {
                      const selected = prefs.recurringReminderDaysBefore === days;
                      return (
                        <Pressable
                          key={days}
                          onPress={() => prefs.setRecurringReminderDaysBefore(days)}
                          style={{
                            ...chipStyle,
                            backgroundColor: selected ? color.surfaceStrong : color.chip,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: selected ? color.onStrong : color.body }}>
                            {days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </SectionCard>
          {showAndroidPicker && timePicker}
        </>
      )}

      <Label>Check</Label>
      <SectionCard>
        <Pressable
          onPress={() => void scheduleTestReminder().then((sent) => {
            setPermission(sent);
            show(
              sent ? "Test reminder will arrive in 5 seconds" : "Notifications are off",
              { tone: sent ? "success" : "error" }
            );
          })}
          style={({ pressed }) => ({ ...rowStyle, backgroundColor: pressed ? color.pressed : color.surface })}
        >
          <Text style={{ ...type.rowTitleLg, fontWeight: "600", color: color.accent }}>
            Send a test reminder
          </Text>
        </Pressable>
      </SectionCard>
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
  minHeight: 44,
  justifyContent: "center",
  borderRadius: radius.chip,
  paddingHorizontal: space.md,
  paddingVertical: 9,
} as const;
