import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { Q } from "@nozbe/watermelondb";
import {
  applyKey, toMinor, snapshotRate, formatWhole, FALLBACK_EMOJI,
  type AmountKey, type CategoryKind,
} from "@budget/shared";
import { database } from "@/db";
import type { Category, Transaction } from "@/db/models";
import { currentUserId } from "@/lib/session";
import { useQuery } from "@/db/hooks";
import { useSpace } from "@/state/space";
import { syncQuietly } from "@/lib/sync";
import { Keypad } from "@/components/keypad";
import { Amt } from "@/components/amt";
import { Rule, EmojiPlain } from "@/components/primitives";
import { useToast } from "@/components/toast";
import {
  color, space, GUTTER, radius, type, CONTINUOUS, DISPLAY_FONT, CATEGORY_COLORS,
} from "@/theme/tokens";

export default function AddEntrySheet() {
  const { spaceId, baseCurrency, displayCurrency, rates } = useSpace();
  const { show } = useToast();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [raw, setRaw] = useState("0");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [page, setPage] = useState<"main" | "category">("main");
  const [saving, setSaving] = useState(false);

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
  const canSave = minor > 0 && category != null && !saving;
  const isExpense = kind === "expense";

  async function save() {
    if (!canSave) return;
    setSaving(true);

    // Freeze the rate now. Without this, this row silently re-prices every
    // time the naira moves and last month's report changes on its own.
    const { rateToBase, baseMinorOf } = snapshotRate(displayCurrency, baseCurrency, rates);

    await database.write(async () => {
      await database.get<Transaction>("transactions").create((t) => {
        t.spaceId = spaceId;
        t.categoryId = category!.id;
        t.createdBy = currentUserId();
        t.kind = kind;
        t.amountMinor = minor;
        t.currency = displayCurrency;
        t.rateToBase = rateToBase;
        t.baseMinor = baseMinorOf(minor);
        t.note = note.trim() || null;
        t.occurredAt = new Date();
        t.recurringRuleId = null;
      });
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    show(isExpense ? "Expense saved" : "Income saved", { tone: "success" });
    // Push it up now; the family should not have to wait for a foreground.
    syncQuietly();
    router.back();
  }

  if (page === "category") {
    return (
      <View style={{ flex: 1, backgroundColor: color.canvas }}>
        <View
          style={{
            flexDirection: "row", alignItems: "center", gap: space.md,
            paddingHorizontal: GUTTER, paddingTop: space.base, paddingBottom: space.md,
            borderBottomWidth: 1, borderBottomColor: color.hairline,
          }}
        >
          <Pressable onPress={() => setPage("main")} hitSlop={12}>
            <Image source="sf:chevron.left" tintColor={color.ink} style={{ width: 16, height: 16 }} />
          </Pressable>
          <Text style={{ ...type.screenTitle, color: color.ink }}>Category</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
          {categories.map((c, i) => (
            <View key={c.id}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategoryId(c.id);
                  setPage("main");
                }}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: space.md,
                  paddingHorizontal: GUTTER, paddingVertical: space.base,
                  backgroundColor: pressed ? color.pressed : "transparent",
                })}
              >
                <EmojiPlain glyph={c.emoji || FALLBACK_EMOJI} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...type.rowTitleLg, color: color.ink }}>{c.name}</Text>
                  <Text style={{ ...type.rowSub, color: CATEGORY_COLORS[c.colorKey] }}>
                    {c.kind === "income" ? "Income" : "Expense"}
                  </Text>
                </View>
                {categoryId === c.id && (
                  <Image source="sf:checkmark" tintColor={color.accent} style={{ width: 14, height: 14 }} />
                )}
              </Pressable>
              {i < categories.length - 1 && (
                <View style={{ height: 1, backgroundColor: color.hairline, marginLeft: 56 }} />
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.canvas }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: GUTTER, paddingTop: space.md, paddingBottom: space.md,
        }}
      >
        <Text style={{ ...type.screenTitle, color: color.ink }}>New entry</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Image source="sf:xmark" tintColor={color.faint} style={{ width: 15, height: 15 }} />
        </Pressable>
      </View>

      {/* Type toggle */}
      <View style={{ paddingHorizontal: GUTTER, marginBottom: space.lg }}>
        <View
          style={{
            flexDirection: "row", padding: 2,
            borderWidth: 1, borderColor: color.hairline,
            borderRadius: radius.chip, ...CONTINUOUS,
          }}
        >
          {(["expense", "income"] as const).map((t) => {
            const active = kind === t;
            return (
              <Pressable
                key={t}
                onPress={() => {
                  Haptics.selectionAsync();
                  setKind(t);
                  setCategoryId(null);
                }}
                style={{
                  flex: 1, paddingVertical: 8, alignItems: "center",
                  borderRadius: 8, ...CONTINUOUS,
                  backgroundColor: active ? (t === "expense" ? color.ink : color.accent) : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 13, fontWeight: "700",
                    color: active ? color.onAccent : color.faint,
                  }}
                >
                  {t === "expense" ? "Expense" : "Income"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Amount */}
      <View style={{ alignItems: "center", marginBottom: space.lg }}>
        <Text style={{ ...type.eyebrow, letterSpacing: 2, marginBottom: space.sm }}>Amount</Text>
        <Amt
          minor={minor}
          currency={displayCurrency}
          size="xl"
          tone={minor === 0 ? color.fainter : isExpense ? color.ink : color.accent}
        />
      </View>

      {/* Category + note */}
      <View style={{ paddingHorizontal: GUTTER, gap: space.sm, marginBottom: space.base }}>
        <Pressable
          onPress={() => setPage("category")}
          style={{
            flexDirection: "row", alignItems: "center", gap: space.sm,
            paddingHorizontal: space.md, paddingVertical: 11,
            borderWidth: 1, borderColor: color.hairline,
            borderRadius: radius.chip, ...CONTINUOUS,
          }}
        >
          {category ? (
            <>
              <Text style={{ fontSize: 16 }}>{category.emoji || FALLBACK_EMOJI}</Text>
              <Text style={{ ...type.rowTitle, flex: 1, color: color.ink }} numberOfLines={1}>
                {category.name}
              </Text>
            </>
          ) : (
            <Text style={{ ...type.rowTitle, flex: 1, color: color.fainter }}>Category</Text>
          )}
          <Image source="sf:chevron.down" tintColor={color.fainter} style={{ width: 11, height: 11 }} />
        </Pressable>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note…"
          placeholderTextColor={color.fainter}
          style={{
            fontSize: 13, color: color.ink,
            paddingHorizontal: space.md, paddingVertical: 11,
            borderWidth: 1, borderColor: color.hairline,
            borderRadius: radius.chip, ...CONTINUOUS,
          }}
        />
      </View>

      {/* Numpad */}
      <View style={{ paddingHorizontal: GUTTER, marginBottom: space.md }}>
        <Keypad onKey={(k: AmountKey) => setRaw((r) => applyKey(r, k))} />
      </View>

      {/* Save */}
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: space.xxl }}>
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={{
            paddingVertical: 15, borderRadius: radius.card, ...CONTINUOUS,
            alignItems: "center",
            backgroundColor: !canSave ? color.hairline : isExpense ? color.ink : color.accent,
          }}
        >
          <Text
            style={{
              fontFamily: DISPLAY_FONT, fontSize: 15,
              color: canSave ? color.onAccent : color.faint,
            }}
          >
            Save {isExpense ? "expense" : "income"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
