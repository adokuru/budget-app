import { useEffect, useRef, useState } from "react";
import { Alert, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { Q } from "@nozbe/watermelondb";
import {
  applyKey, convertMinorAtRate, snapshotRate, toMajor, toMinor, FALLBACK_EMOJI,
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
import { EmojiPlain } from "@/components/primitives";
import { useToast } from "@/components/toast";
import { useTheme } from "@/hooks/use-theme";
import {
  space, GUTTER, radius, CONTINUOUS, DISPLAY_FONT, CATEGORY_COLORS,
} from "@/theme/tokens";

export default function AddEntrySheet() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const entryId = Array.isArray(id) ? id[0] : id;
  const { color, type } = useTheme();
  const { spaceId, baseCurrency, displayCurrency, rates, canEdit } = useSpace();
  const { show } = useToast();
  const [entry, setEntry] = useState<Transaction | null>(null);
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [raw, setRaw] = useState("0");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showAndroidDate, setShowAndroidDate] = useState(false);
  const [page, setPage] = useState<"main" | "category">("main");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const categories = useQuery<Category>(
    () =>
      database.get<Category>("categories").query(
        Q.where("space_id", spaceId), Q.where("kind", kind),
        Q.where("archived", false), Q.sortBy("sort", Q.asc)
      ),
    [spaceId, kind]
  );

  useEffect(() => {
    if (canEdit) return;
    router.back();
  }, [canEdit]);

  useEffect(() => {
    if (!entryId) return;
    let cancelled = false;
    database.get<Transaction>("transactions").find(entryId).then((found) => {
      if (cancelled || found.spaceId !== spaceId) return router.back();
      setEntry(found);
      setKind(found.kind);
      setRaw(String(toMajor(found.amountMinor, found.currency)));
      setCategoryId(found.categoryId);
      setNote(found.note ?? "");
      setOccurredAt(found.occurredAt);
    }).catch(() => router.back());
    return () => { cancelled = true; };
  }, [entryId, spaceId]);

  const currency = entry?.currency ?? displayCurrency;
  const minor = toMinor(raw || "0", currency);
  const category = categories.find((c) => c.id === categoryId);
  const canSave = canEdit && minor > 0 && category != null && occurredAt.getTime() <= Date.now()
    && !saving && (!entryId || entry != null);
  const isExpense = kind === "expense";

  async function save() {
    if (occurredAt.getTime() > Date.now()) {
      show("Choose today or an earlier date", { tone: "error" });
      return;
    }
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    try {
      await database.write(async () => {
        if (entry) {
          await entry.update((t) => {
            t.categoryId = category!.id;
            t.kind = kind;
            t.amountMinor = minor;
            t.baseMinor = convertMinorAtRate(minor, entry.currency, baseCurrency, entry.rateToBase);
            t.note = note.trim() || null;
            t.occurredAt = occurredAt;
          });
          return;
        }

        // New entries freeze today's rate. Edits retain the original snapshot.
        const { rateToBase, baseMinorOf } = snapshotRate(displayCurrency, baseCurrency, rates);
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
          t.occurredAt = occurredAt;
          t.recurringRuleId = null;
        });
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      show(entry ? "Entry updated" : isExpense ? "Expense saved" : "Income saved", { tone: "success" });
      syncQuietly();
      router.back();
    } catch (error) {
      show(error instanceof Error ? error.message : "Could not save this entry", { tone: "error" });
      savingRef.current = false;
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!entry) return;
    Alert.alert(
      "Delete this entry?",
      entry.recurringRuleId
        ? "This removes only this occurrence. The recurring item stays active."
        : "This entry will be removed from your budget.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete entry",
          style: "destructive",
          onPress: () => void database.write(() => entry.markAsDeleted()).then(() => {
            show("Entry deleted", { tone: "success" });
            syncQuietly();
            router.back();
          }).catch(() => show("Could not delete this entry", { tone: "error" })),
        },
      ]
    );
  }

  if (!canEdit || (entryId && !entry)) return null;

  if (page === "category") {
    return (
      <View style={{ flex: 1, backgroundColor: color.canvas }}>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingBottom: space.xxl }}
        >
          <View
            style={{
              flexDirection: "row", alignItems: "center", gap: space.md,
              paddingHorizontal: GUTTER, paddingTop: space.base, paddingBottom: space.md,
              backgroundColor: color.canvas,
              borderBottomWidth: 1, borderBottomColor: color.hairline,
            }}
          >
            <Pressable
              accessibilityLabel="Back to entry"
              onPress={() => setPage("main")}
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Image source="sf:chevron.left" tintColor={color.ink} style={{ width: 16, height: 16 }} />
            </Pressable>
            <Text style={{ ...type.screenTitle, color: color.ink }}>Category</Text>
          </View>

          {categories.map((c, i) => (
            <View key={c.id}>
              <Pressable
                accessibilityLabel={`Select ${c.name} category`}
                accessibilityState={{ selected: categoryId === c.id }}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategoryId(c.id);
                  setPage("main");
                }}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: space.md,
                  minHeight: 56, paddingHorizontal: GUTTER, paddingVertical: space.base,
                  backgroundColor: pressed ? color.pressed : "transparent",
                })}
              >
                <EmojiPlain glyph={c.emoji || FALLBACK_EMOJI} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...type.rowTitleLg, color: color.ink }}>{c.name}</Text>
                  <Text style={{ ...type.rowSub, color: color.faint }}>
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
    <ScrollView
      style={{ flex: 1, backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: space.xxl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: GUTTER, paddingTop: space.md, paddingBottom: space.md,
        }}
      >
        <Text style={{ ...type.screenTitle, color: color.ink }}>{entry ? "Edit entry" : "New entry"}</Text>
        <Pressable
          accessibilityLabel="Close entry sheet"
          onPress={() => router.back()}
          style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
        >
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
                accessibilityLabel={`Set entry type to ${t}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  Haptics.selectionAsync();
                  setKind(t);
                  setCategoryId(null);
                }}
                style={{
                  flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center",
                  borderRadius: 8, ...CONTINUOUS,
                  backgroundColor: active ? (t === "expense" ? color.surfaceStrong : color.positive) : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 13, fontWeight: "700",
                    color: active ? (t === "income" ? color.onPositive : color.onStrong) : color.faint,
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
          currency={currency}
          size="xl"
          tone={minor === 0 ? color.fainter : isExpense ? color.ink : color.positive}
        />
      </View>

      {/* Category + note */}
      <View style={{ paddingHorizontal: GUTTER, gap: space.sm, marginBottom: space.base }}>
        <Pressable
          accessibilityLabel="Choose category"
          onPress={() => setPage("category")}
          style={{
            flexDirection: "row", alignItems: "center", gap: space.sm,
            minHeight: 48, paddingHorizontal: space.md, paddingVertical: 11,
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
          testID="entry-note"
          value={note}
          onChangeText={setNote}
          placeholder="Add a note (optional)"
          accessibilityLabel="Note"
          placeholderTextColor={color.fainter}
          style={{
            minHeight: 48, fontSize: 13, color: color.ink,
            paddingHorizontal: space.md, paddingVertical: 11,
            borderWidth: 1, borderColor: color.hairline,
            borderRadius: radius.chip, ...CONTINUOUS,
          }}
        />

        {entry?.recurringRuleId && (
          <Text style={{ ...type.rowSub, color: color.faint }}>
            This change only affects this entry. The recurring item stays the same.
          </Text>
        )}

        <View
          style={{
            minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            paddingHorizontal: space.md, borderWidth: 1, borderColor: color.hairline,
            borderRadius: radius.chip, ...CONTINUOUS,
          }}
        >
          <Text style={{ ...type.rowTitle, color: color.ink }}>Date</Text>
          {Platform.OS === "ios" ? (
            <DateTimePicker
              accessibilityLabel="Entry date"
              value={occurredAt}
              mode="date"
              display="compact"
              maximumDate={new Date()}
              onValueChange={(_, value) => setOccurredAt(value)}
            />
          ) : (
            <Pressable
              accessibilityLabel="Entry date"
              onPress={() => setShowAndroidDate(true)}
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <Text style={type.action}>{occurredAt.toLocaleDateString()}</Text>
            </Pressable>
          )}
        </View>
        {showAndroidDate && (
          <DateTimePicker
            value={occurredAt}
            mode="date"
            maximumDate={new Date()}
            onValueChange={(_, value) => setOccurredAt(value)}
            onDismiss={() => setShowAndroidDate(false)}
          />
        )}
      </View>

      {/* Numpad */}
      <View style={{ paddingHorizontal: GUTTER, marginBottom: space.md }}>
        <Keypad onKey={(k: AmountKey) => setRaw((r) => applyKey(r, k))} />
      </View>

      {/* Save */}
      <View style={{ paddingHorizontal: GUTTER }}>
        <Pressable
          accessibilityLabel={entry ? "Save entry changes" : "Save entry"}
          onPress={save}
          disabled={!canSave}
          style={{
            minHeight: 48, borderRadius: radius.card, ...CONTINUOUS,
            alignItems: "center", justifyContent: "center",
            backgroundColor: !canSave ? color.hairline : isExpense ? color.surfaceStrong : color.accent,
          }}
        >
          <Text
            style={{
              fontFamily: DISPLAY_FONT, fontSize: 15,
              color: canSave ? (isExpense ? color.onStrong : color.onAccent) : color.faint,
            }}
          >
            {entry ? "Save changes" : `Save ${isExpense ? "expense" : "income"}`}
          </Text>
        </Pressable>
        {entry && (
          <Pressable
            accessibilityLabel="Delete entry"
            onPress={confirmDelete}
            style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ ...type.action, color: color.danger }}>Delete entry</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
