import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { Q } from "@nozbe/watermelondb";
import { applyKey, toMajor, toMinor, type AmountKey } from "@budget/shared";
import { database } from "@/db";
import type { Budget, Category } from "@/db/models";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { syncQuietly } from "@/lib/sync";
import { Keypad } from "@/components/keypad";
import { CategoryPicker } from "@/components/category-picker";
import { Amt } from "@/components/amt";
import { useToast } from "@/components/toast";
import { useTheme } from "@/hooks/use-theme";
import { monthStart } from "@/lib/period";
import { space } from "@/theme/tokens";

export default function BudgetEditorSheet() {
  const { categoryId: categoryParam } = useLocalSearchParams<{
    categoryId?: string | string[];
  }>();
  const initialCategoryId = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
  const { color, type } = useTheme();
  const { spaceId, displayCurrency, canEdit } = useSpace();
  const { show } = useToast();
  const periodStart = useMemo(() => monthStart().getTime(), []);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId ?? null);
  const [raw, setRaw] = useState("0");
  const [hydrating, setHydrating] = useState(Boolean(initialCategoryId));

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

  const currency = budget?.currency ?? displayCurrency;
  const minor = toMinor(raw || "0", currency);
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const canSave = canEdit && !hydrating && minor > 0 && selectedCategory !== undefined;

  useEffect(() => {
    if (!canEdit) router.back();
  }, [canEdit]);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    database.get<Budget>("budgets").query(
      Q.where("space_id", spaceId),
      Q.where("category_id", categoryId),
      Q.where("period_start", periodStart)
    ).fetch().then(([found]) => {
      if (cancelled) return;
      setBudget(found ?? null);
      if (found) {
        setRaw(String(toMajor(found.amountMinor, found.currency)));
      } else {
        setRaw("0");
      }
      setHydrating(false);
    }).catch(() => {
      if (!cancelled) setHydrating(false);
    });
    return () => { cancelled = true; };
  }, [categoryId, periodStart, spaceId]);

  function selectCategory(nextCategoryId: string) {
    if (nextCategoryId === categoryId) return;
    setHydrating(true);
    setCategoryId(nextCategoryId);
  }

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
          b.currency = currency;
        });
      } else {
        await database.get<Budget>("budgets").create((b) => {
          b.spaceId = spaceId;
          b.categoryId = categoryId!;
          b.periodStart = new Date(periodStart);
          b.amountMinor = minor;
          b.currency = currency;
        });
      }
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    show("Monthly budget saved", { tone: "success" });
    // Push it up now; the family should not have to wait for a foreground.
    syncQuietly();
    router.back();
  }

  if (!canEdit || hydrating) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.canvas }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ ...type.body, color: color.faint }}>Cancel</Text>
        </Pressable>
        <Text style={{ ...type.body, fontWeight: "600", color: color.ink }}>Monthly limit</Text>
        <Pressable onPress={save} disabled={!canSave} hitSlop={12}>
          <Text style={{ ...type.body, fontWeight: "600", color: canSave ? color.accent : color.hairline }}>
            Save
          </Text>
        </Pressable>
      </View>

      <View style={{ alignItems: "center", paddingVertical: space.base }}>
        <Amt
          minor={minor}
          currency={currency}
          size="xl"
          tone={minor === 0 ? color.hairline : color.ink}
          hideFraction={!raw.includes(".")}
        />
      </View>

      <CategoryPicker
        categories={categories}
        selectedId={categoryId}
        onSelect={selectCategory}
      />

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
        <Keypad onKey={(k: AmountKey) => setRaw((r) => applyKey(r, k))} />
      </View>
    </ScrollView>
  );
}
