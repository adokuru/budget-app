import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, ScrollView, Switch, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Host, Picker as NativePicker } from "@expo/ui";
import NativeSegmentedControl from "@expo/ui/community/segmented-control";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { Q } from "@nozbe/watermelondb";
import {
  applyKey, toMajor, toMinor, describeRecurrence, nextOccurrence, occurrenceOnOrAfter, calendarDay, ordinal,
  type AmountKey, type CategoryKind, type Freq,
} from "@budget/shared";
import { database } from "@/db";
import type { Category, RecurringRule, Transaction } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { usePrefs } from "@/state/prefs";
import { syncQuietly } from "@/lib/sync";
import { Keypad } from "@/components/keypad";
import { CategoryPicker } from "@/components/category-picker";
import { Amt } from "@/components/amt";
import { useToast } from "@/components/toast";
import { useTheme } from "@/hooks/use-theme";
import { space, radius, CONTINUOUS } from "@/theme/tokens";

const FREQS: { key: Freq; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Every 2 weeks" },
  { key: "yearly", label: "Yearly" },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS = Array.from({ length: 31 }, (_, index) => ({ key: index + 1, label: ordinal(index + 1) }));

export default function RecurringRuleSheet() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const ruleId = Array.isArray(id) ? id[0] : id;
  const { color, type, scheme } = useTheme();
  const { spaceId, displayCurrency, canEdit } = useSpace();
  const { confirmIncome } = usePrefs();
  const { show } = useToast();
  const [rule, setRule] = useState<RecurringRule | null>(null);
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [freq, setFreq] = useState<Freq>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState(25);
  const [weekday, setWeekday] = useState(1);
  const [autoPost, setAutoPost] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [raw, setRaw] = useState("0");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const saveActionRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (canEdit) return;
    router.back();
  }, [canEdit]);

  useEffect(() => {
    if (!ruleId) return;
    let cancelled = false;
    database.get<RecurringRule>("recurring_rules").find(ruleId).then((found) => {
      if (cancelled || found.spaceId !== spaceId) return router.back();
      setRule(found);
      setKind(found.kind);
      setFreq(found.freq);
      setDayOfMonth(found.dayOfMonth ?? 25);
      setWeekday(found.weekday ?? 1);
      setAutoPost(found.autoPost);
      setCategoryId(found.categoryId);
      setRaw(String(toMajor(found.amountMinor, found.currency)));
    }).catch(() => router.back());
    return () => { cancelled = true; };
  }, [ruleId, spaceId]);

  const categories = useQuery<Category>(
    () =>
      database.get<Category>("categories").query(
        Q.where("space_id", spaceId), Q.where("kind", kind),
        Q.where("archived", false), Q.sortBy("sort", Q.asc)
      ),
    [spaceId, kind]
  );

  const currency = rule?.currency ?? displayCurrency;
  const minor = toMinor(raw || "0", currency);
  const category = categories.find((c) => c.id === categoryId);
  const canSave = canEdit && minor > 0 && category != null && !saving && (!ruleId || rule != null);

  const recurrence = useMemo(
    () => ({
      freq,
      dayOfMonth: freq === "monthly" || freq === "yearly" ? dayOfMonth : null,
      weekday: freq === "weekly" || freq === "biweekly" ? weekday : null,
      interval: 1,
      startOn: calendarDay(Date.now()),
    }),
    [freq, dayOfMonth, weekday]
  );

  async function save() {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const today = calendarDay(Date.now());
    const next = (rule?.lastRunAt
      ? nextOccurrence(recurrence, rule.lastRunAt.getTime())
      : occurrenceOnOrAfter(recurrence, today)) ?? today;

    try {
      await database.write(async () => {
        if (rule) {
          await rule.update((r) => {
            r.categoryId = category!.id;
            r.kind = kind;
            r.label = category!.name;
            r.amountMinor = minor;
            r.freq = freq;
            r.dayOfMonth = recurrence.dayOfMonth;
            r.weekday = recurrence.weekday;
            r.interval = 1;
            r.startOn = new Date(recurrence.startOn);
            r.endOn = null;
            r.autoPost = autoPost;
            r.nextRunAt = new Date(next);
          });
          return;
        }

        await database.get<RecurringRule>("recurring_rules").create((r) => {
          r.spaceId = spaceId;
          r.categoryId = category!.id;
          r.kind = kind;
          r.label = category!.name;
          r.amountMinor = minor;
          r.currency = displayCurrency;
          r.freq = freq;
          r.dayOfMonth = recurrence.dayOfMonth;
          r.weekday = recurrence.weekday;
          r.interval = 1;
          r.startOn = new Date(recurrence.startOn);
          r.endOn = null;
          r.autoPost = autoPost;
          r.nextRunAt = new Date(next);
          r.lastRunAt = null;
          r.active = true;
        });
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      show(rule ? "Recurring item updated" : "Recurring item saved", { tone: "success" });
      syncQuietly();
      router.back();
    } catch (error) {
      show(error instanceof Error ? error.message : "Could not save this recurring item", { tone: "error" });
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function setActive(active: boolean) {
    if (!rule) return;
    const today = calendarDay(Date.now());
    await database.write(async () => {
      const postedToday = active && await database.get<Transaction>("transactions").query(
        Q.where("space_id", spaceId),
        Q.where("recurring_rule_id", rule.id),
        Q.where("occurred_at", today)
      ).fetchCount() > 0;
      const cursor = postedToday ? today : today - 86_400_000;
      const next = (postedToday
        ? nextOccurrence(recurrence, today)
        : occurrenceOnOrAfter(recurrence, today)) ?? today;
      await rule.update((r) => {
        r.active = active;
        if (active) {
          r.startOn = new Date(recurrence.startOn);
          r.lastRunAt = new Date(cursor);
          r.nextRunAt = new Date(next);
        }
      });
    });
    show(active ? "Recurring item resumed" : "Recurring item paused", { tone: "success" });
    syncQuietly();
    router.back();
  }

  function confirmDelete() {
    if (!rule) return;
    Alert.alert(
      "Delete recurring item?",
      "Past entries stay in your history. No future entries will be added.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete item", style: "destructive",
          onPress: () => void database.write(() => rule.markAsDeleted()).then(() => {
            show("Recurring item deleted", { tone: "success" });
            syncQuietly();
            router.back();
          }).catch(() => show("Could not delete this recurring item", { tone: "error" })),
        },
      ]
    );
  }

  saveActionRef.current = () => { void save(); };
  const screenOptions = useMemo(
    () => ({
      headerShadowVisible: false,
      headerTitleAlign: "center" as const,
      headerStyle: { backgroundColor: color.canvas },
      title: rule ? "Edit recurring item" : "New recurring item",
      headerLeft: () => (
        <Button
          title="Cancel"
          accessibilityLabel="Cancel recurring item"
          color={color.faint}
          onPress={() => router.back()}
        />
      ),
      headerRight: () => (
        <Button
          title="Save"
          accessibilityLabel="Save recurring item"
          color={color.accent}
          disabled={!canSave}
          onPress={() => saveActionRef.current()}
        />
      ),
    }),
    [rule, canSave, color.canvas, color.faint, color.accent]
  );

  if (!canEdit || (ruleId && !rule)) return null;

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <ScrollView
        style={{ flex: 1, backgroundColor: color.canvas }}
        contentContainerStyle={{ paddingTop: space.sm, paddingBottom: space.xxl, gap: space.base }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={{ alignItems: "center", paddingTop: space.sm }}>
          <Amt
            minor={minor}
            currency={currency}
            size="xl"
            tone={minor === 0 ? color.hairline : kind === "income" ? color.positive : color.ink}
            hideFraction={!raw.includes(".")}
          />
          <Text style={{ ...type.rowSub, color: color.faint, marginTop: space.xs }}>
            {describeRecurrence(recurrence)}
          </Text>
        </View>

        <View style={{ marginHorizontal: space.lg, gap: space.sm }}>
          <Text style={{ ...type.eyebrow, color: color.faint }}>Entry type</Text>
          <NativeSegmentedControl
            values={["Expense", "Income"]}
            selectedIndex={kind === "expense" ? 0 : 1}
            appearance={scheme}
            testID="recurring-kind"
            style={{ height: 48 }}
            onChange={({ nativeEvent }) => {
              const nextKind: CategoryKind = nativeEvent.selectedSegmentIndex === 0 ? "expense" : "income";
              setKind(nextKind);
              setCategoryId(null);
              if (!rule) setAutoPost(nextKind === "income" ? !confirmIncome : true);
            }}
          />
        </View>

        <View
          style={{
            marginHorizontal: space.lg, backgroundColor: color.chip,
            borderRadius: radius.chip, ...CONTINUOUS, overflow: "hidden",
          }}
        >
          <NativePickerRow
            label="Repeats"
            value={freq}
            options={FREQS}
            onChange={setFreq}
            testID="recurrence-frequency-picker"
          />
          <View style={{ height: 1, marginLeft: space.base, backgroundColor: color.hairline }} />
          {freq === "monthly" || freq === "yearly" ? (
            <NativePickerRow
              label="Day of month"
              detail={dayOfMonth > 28 ? "Short months use their last day" : undefined}
              value={dayOfMonth}
              options={DAYS}
              onChange={setDayOfMonth}
              testID="day-of-month-picker"
            />
          ) : (
            <NativePickerRow
              label="Day of week"
              value={weekday}
              options={WEEKDAYS.map((label, key) => ({ key, label }))}
              onChange={setWeekday}
              testID="weekday-picker"
            />
          )}
        </View>

        <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

        <View
          style={{
            marginHorizontal: space.lg, padding: space.base,
            minHeight: 64, backgroundColor: color.canvas, borderRadius: radius.chip, ...CONTINUOUS,
            borderWidth: 1, borderColor: color.hairline,
            flexDirection: "row", alignItems: "center", gap: space.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...type.body, color: color.ink }}>
              {kind === "income" ? "Count automatically" : "Add automatically"}
            </Text>
            <Text style={{ ...type.rowSub, color: color.faint }}>
              {kind === "income"
                ? autoPost
                  ? "Count it as received on the due date."
                  : "Wait for you to mark it received."
                : autoPost
                  ? "Add this bill on its due date."
                  : "Wait for you to mark it paid."}
            </Text>
          </View>
          <Switch
            accessibilityLabel={kind === "income" ? "Count income automatically" : "Add expense automatically"}
            value={autoPost}
            onValueChange={(v) => { Haptics.selectionAsync(); setAutoPost(v); }}
            trackColor={{ true: color.accent }}
          />
        </View>

        <View style={{ paddingHorizontal: space.lg }}>
          <Keypad onKey={(k: AmountKey) => setRaw((r) => applyKey(r, k))} />
        </View>

        {rule && (
          <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
            <Pressable
              accessibilityLabel={rule.active ? "Pause recurring item" : "Resume recurring item"}
              onPress={() => void setActive(!rule.active)}
              style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={type.action}>{rule.active ? "Pause" : "Resume"}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Delete recurring item"
              onPress={confirmDelete}
              style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ ...type.action, color: color.danger }}>Delete recurring item</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function NativePickerRow<T extends string | number>({
  label, detail, value, options, onChange, testID,
}: {
  label: string;
  detail?: string;
  value: T;
  options: { key: T; label: string }[];
  onChange: (value: T) => void;
  testID: string;
}) {
  const { color, type, scheme } = useTheme();

  return (
    <View style={{ minHeight: 64, paddingLeft: space.base, flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...type.body, color: color.ink }}>{label}</Text>
        {detail && <Text style={{ ...type.rowSub, color: color.faint }}>{detail}</Text>}
      </View>
      <Host
        matchContents={{ vertical: true }}
        colorScheme={scheme}
        seedColor={color.accent}
        ignoreSafeArea="all"
        style={{ width: 160, minHeight: 48 }}
      >
        <NativePicker selectedValue={value} onValueChange={onChange} appearance="menu" testID={testID}>
          {options.map((option) => (
            <NativePicker.Item key={String(option.key)} label={option.label} value={option.key} />
          ))}
        </NativePicker>
      </Host>
    </View>
  );
}
