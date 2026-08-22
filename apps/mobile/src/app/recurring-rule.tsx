import { useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Q } from "@nozbe/watermelondb";
import {
  applyKey, toMinor, describeRecurrence, nextOccurrence, ordinal, utcDay,
  type AmountKey, type CategoryKind, type Freq,
} from "@budget/shared";
import { database } from "@/db";
import type { Category, RecurringRule } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { Keypad } from "@/components/keypad";
import { CategoryPicker } from "@/components/category-picker";
import { Money } from "@/components/money";
import { color, space, radius, type, CONTINUOUS } from "@/theme/tokens";

const FREQS: { key: Freq; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "2 weeks" },
  { key: "yearly", label: "Yearly" },
];

export default function RecurringRuleSheet() {
  const { spaceId, displayCurrency } = useSpace();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [freq, setFreq] = useState<Freq>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState(25);
  const [weekday, setWeekday] = useState(1);
  const [autoPost, setAutoPost] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [raw, setRaw] = useState("0");

  const categories = useQuery<Category>(
    () =>
      database.get<Category>("categories").query(
        Q.where("space_id", spaceId), Q.where("kind", kind),
        Q.where("archived", false), Q.sortBy("sort", Q.asc)
      ),
    [spaceId, kind]
  );

  const minor = toMinor(raw || "0", displayCurrency);
  const category = categories.find((c) => c.id === categoryId);
  const canSave = minor > 0 && category != null;

  const recurrence = useMemo(
    () => ({
      freq,
      dayOfMonth: freq === "monthly" || freq === "yearly" ? dayOfMonth : null,
      weekday: freq === "weekly" || freq === "biweekly" ? weekday : null,
      interval: 1,
      startOn: utcDay(Date.now()),
    }),
    [freq, dayOfMonth, weekday]
  );

  async function save() {
    if (!canSave) return;
    const next = nextOccurrence(recurrence, utcDay(Date.now()) - 1) ?? utcDay(Date.now());

    await database.write(async () => {
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
    router.back();
  }

  return (
    /*
      The ScrollView is the sheet's single subview, with the header sticky
      inside it. RNScreens' FormSheet special-cases a ScrollView child and
      lays out incorrectly when it has to share the sheet with siblings.
    */
    <ScrollView
      style={{ flex: 1, backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: space.xxl, gap: space.base }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md,
          backgroundColor: color.canvas,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ ...type.body, color: color.muted }}>Cancel</Text>
        </Pressable>
        <Text style={{ ...type.body, fontWeight: "600", color: color.ink }}>Recurring</Text>
        <Pressable onPress={save} disabled={!canSave} hitSlop={12}>
          <Text style={{ ...type.body, fontWeight: "600", color: canSave ? color.accent : color.hairline }}>
            Save
          </Text>
        </Pressable>
      </View>

        <View style={{ alignItems: "center", paddingTop: space.sm }}>
          <Money
            minor={minor}
            currency={displayCurrency}
            size="display"
            tone={minor === 0 ? color.hairline : kind === "income" ? color.accent : color.ink}
            hideFraction={!raw.includes(".")}
          />
          <Text style={{ ...type.caption, color: color.muted, marginTop: space.xs }}>
            {describeRecurrence(recurrence)}
          </Text>
        </View>

        <Segmented
          options={[{ key: "expense", label: "Spend" }, { key: "income", label: "Income" }]}
          value={kind}
          onChange={(k) => { setKind(k as CategoryKind); setCategoryId(null); }}
        />

        <Segmented
          options={FREQS.map((f) => ({ key: f.key, label: f.label }))}
          value={freq}
          onChange={(f) => setFreq(f as Freq)}
        />

        {(freq === "monthly" || freq === "yearly") && (
          <DayGrid value={dayOfMonth} onChange={setDayOfMonth} />
        )}
        {(freq === "weekly" || freq === "biweekly") && (
          <Segmented
            options={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => ({
              key: String(i), label: d,
            }))}
            value={String(weekday)}
            onChange={(w) => setWeekday(Number(w))}
          />
        )}

        <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

        <View
          style={{
            marginHorizontal: space.lg, padding: space.base,
            backgroundColor: color.card, borderRadius: radius.row, ...CONTINUOUS,
            flexDirection: "row", alignItems: "center", gap: space.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ ...type.body, color: color.ink }}>Post automatically</Text>
            <Text style={{ ...type.caption, color: color.muted }}>
              {autoPost
                ? "Added on the date without asking. Good for rent and subscriptions."
                : "Asks you to confirm it landed. Better for salary, which can be late."}
            </Text>
          </View>
          <Switch
            value={autoPost}
            onValueChange={(v) => { Haptics.selectionAsync(); setAutoPost(v); }}
            trackColor={{ true: color.accent }}
          />
        </View>

        <View style={{ paddingHorizontal: space.lg }}>
          <Keypad onKey={(k: AmountKey) => setRaw((r) => applyKey(r, k))} />
      </View>
    </ScrollView>
  );
}

function Segmented({
  options, value, onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row", marginHorizontal: space.lg,
        backgroundColor: color.hairline, borderRadius: radius.pill, padding: 2,
      }}
    >
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => { Haptics.selectionAsync(); onChange(o.key); }}
          style={{
            flex: 1, paddingVertical: 7, borderRadius: radius.pill, alignItems: "center",
            backgroundColor: value === o.key ? color.card : "transparent",
          }}
        >
          <Text style={{ ...type.label, color: value === o.key ? color.ink : color.muted }}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** A calendar-shaped day picker beats a wheel for "salary on the 25th". */
function DayGrid({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  return (
    <View style={{ paddingHorizontal: space.lg, gap: space.xs }}>
      <Text style={{ ...type.micro, color: color.muted }}>Day of month</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
          const active = d === value;
          return (
            <Pressable
              key={d}
              onPress={() => { Haptics.selectionAsync(); onChange(d); }}
              style={{
                width: 40, height: 34, borderRadius: radius.chip, ...CONTINUOUS,
                alignItems: "center", justifyContent: "center",
                backgroundColor: active ? color.ink : color.card,
              }}
            >
              <Text style={{ ...type.label, color: active ? color.onInk : color.ink }}>{d}</Text>
            </Pressable>
          );
        })}
      </View>
      {value > 28 && (
        <Text style={{ ...type.caption, color: color.muted }}>
          Months without a {ordinal(value)} use their last day.
        </Text>
      )}
    </View>
  );
}
