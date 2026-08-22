import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Q } from "@nozbe/watermelondb";
import { applyKey, toMinor, type AmountKey } from "@budget/shared";
import { database } from "@/db";
import type { Budget, Category } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { Keypad } from "@/components/keypad";
import { CategoryPicker } from "@/components/category-picker";
import { Money } from "@/components/money";
import { monthStart } from "@/lib/period";
import { color, space, type } from "@/theme/tokens";

export default function BudgetEditorSheet() {
  const { spaceId, displayCurrency } = useSpace();
  const periodStart = useMemo(() => monthStart().getTime(), []);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [raw, setRaw] = useState("0");

  const categories = useQuery<Category>(
    () =>
      database.get<Category>("categories").query(
        Q.where("space_id", spaceId),
        Q.where("kind", "expense"),
        Q.where("archived", false),
        Q.sortBy("sort", Q.asc)
      ),
    [spaceId]
  );

  const minor = toMinor(raw || "0", displayCurrency);
  const canSave = minor > 0 && categoryId !== null;

  async function save() {
    if (!canSave) return;

    // One envelope per category per period — upsert rather than stacking rows.
    const existing = await database
      .get<Budget>("budgets")
      .query(
        Q.where("space_id", spaceId),
        Q.where("category_id", categoryId!),
        Q.where("period_start", periodStart)
      )
      .fetch();

    await database.write(async () => {
      if (existing[0]) {
        await existing[0].update((b) => {
          b.amountMinor = minor;
          b.currency = displayCurrency;
        });
      } else {
        await database.get<Budget>("budgets").create((b) => {
          b.spaceId = spaceId;
          b.categoryId = categoryId!;
          b.periodStart = new Date(periodStart);
          b.amountMinor = minor;
          b.currency = displayCurrency;
        });
      }
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.canvas }}>
      <View
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ ...type.body, color: color.muted }}>Cancel</Text>
        </Pressable>
        <Text style={{ ...type.body, fontWeight: "600", color: color.ink }}>Monthly limit</Text>
        <Pressable onPress={save} disabled={!canSave} hitSlop={12}>
          <Text style={{ ...type.body, fontWeight: "600", color: canSave ? color.accent : color.hairline }}>
            Save
          </Text>
        </Pressable>
      </View>

      <View style={{ alignItems: "center", paddingVertical: space.base }}>
        <Money
          minor={minor}
          currency={displayCurrency}
          size="display"
          tone={minor === 0 ? color.hairline : color.ink}
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
