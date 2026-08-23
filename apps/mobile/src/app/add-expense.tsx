import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  applyKey, toMinor, snapshotRate,
  type AmountKey, type CategoryKind,
} from "@budget/shared";
import { Keypad } from "@/components/keypad";
import { CategoryPicker } from "@/components/category-picker";
import { Money } from "@/components/money";
import { database } from "@/db";
import type { Category, Transaction } from "@/db/models";
import { currentUserId } from "@/lib/session";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { syncQuietly } from "@/lib/sync";
import { color, space, radius, type } from "@/theme/tokens";
import { Q } from "@nozbe/watermelondb";

export default function AddExpenseSheet() {
  const { spaceId, baseCurrency, displayCurrency, rates } = useSpace();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [raw, setRaw] = useState("0");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = useQuery<Category>(
    () =>
      database
        .get<Category>("categories")
        .query(Q.where("space_id", spaceId), Q.where("kind", kind), Q.where("archived", false), Q.sortBy("sort", Q.asc)),
    [spaceId, kind]
  );

  const minor = toMinor(raw || "0", displayCurrency);
  const canSave = minor > 0 && categoryId !== null && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);

    // Freeze the rate now. Without this, this row silently re-prices every
    // time the naira moves and last month's report changes on its own.
    const { rateToBase, baseMinorOf } = snapshotRate(displayCurrency, baseCurrency, rates);

    await database.write(async () => {
      await database.get<Transaction>("transactions").create((t) => {
        t.spaceId = spaceId;
        t.categoryId = categoryId!;
        t.createdBy = currentUserId();
        t.kind = kind;
        t.amountMinor = minor;
        t.currency = displayCurrency;
        t.rateToBase = rateToBase;
        t.baseMinor = baseMinorOf(minor);
        t.note = null;
        t.occurredAt = new Date();
        t.recurringRuleId = null;
      });
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Push it up now; the family should not have to wait for a foreground.
    syncQuietly();
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.canvas }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: space.lg,
          paddingTop: space.lg,
          paddingBottom: space.sm,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ ...type.body, color: color.muted }}>Cancel</Text>
        </Pressable>

        <SegmentedKind value={kind} onChange={(k) => { setKind(k); setCategoryId(null); }} />

        <Pressable onPress={save} disabled={!canSave} hitSlop={12}>
          <Text style={{ ...type.body, fontWeight: "600", color: canSave ? color.accent : color.hairline }}>
            Save
          </Text>
        </Pressable>
      </View>

      <View style={{ alignItems: "center", paddingVertical: space.lg }}>
        <Money
          minor={kind === "expense" ? -minor : minor}
          currency={displayCurrency}
          size="display"
          tone={minor === 0 ? color.hairline : kind === "expense" ? color.ink : color.accent}
          hideFraction={!raw.includes(".")}
        />
      </View>

      {/*
        flexGrow:0 is load-bearing: a horizontal ScrollView inside a flex column
        otherwise claims the remaining height and stretches the pills into circles.
      */}
      <CategoryPicker
        categories={categories}
        selectedId={categoryId}
        onSelect={setCategoryId}
      />

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
        <Keypad onKey={(k: AmountKey) => setRaw((r) => applyKey(r, k))} />
      </View>
    </View>
  );
}

function SegmentedKind({
  value,
  onChange,
}: {
  value: CategoryKind;
  onChange: (k: CategoryKind) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: color.hairline,
        borderRadius: radius.pill,
        padding: 2,
      }}
    >
      {(["expense", "income"] as const).map((k) => (
        <Pressable
          key={k}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(k);
          }}
          style={{
            paddingVertical: 6,
            paddingHorizontal: space.base,
            borderRadius: radius.pill,
            backgroundColor: value === k ? color.card : "transparent",
          }}
        >
          <Text style={{ ...type.label, color: value === k ? color.ink : color.muted }}>
            {k === "expense" ? "Spend" : "Income"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
