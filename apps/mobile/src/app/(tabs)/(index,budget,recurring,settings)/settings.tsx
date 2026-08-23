import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  CURRENCIES, CURRENCY_CODES, PIVOT, rate as rateFor, type Currency,
} from "@budget/shared";
import { useSpace } from "@/state/space";
import { useAuth } from "@/state/auth";
import { usePrefs } from "@/state/prefs";
import { setOverride } from "@/lib/rates";
import { AppHeader } from "@/components/app-header";
import { Rule, Label, Row, StatStrip } from "@/components/primitives";
import { color, space, GUTTER, radius, type, CONTINUOUS, DISPLAY_FONT } from "@/theme/tokens";

export default function SettingsScreen() {
  const {
    space: current, isShared, baseCurrency, displayCurrency, setDisplayCurrency,
    rates, refreshRates,
  } = useSpace();
  const { user } = useAuth();
  const prefs = usePrefs();

  const asOf = rates.fetchedAt
    ? new Date(rates.fetchedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : "not fetched yet";

  const initials = (user?.name ?? "You")
    .split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      <AppHeader spaceName={current.name} isShared={isShared} />

      {/* ── Profile ── */}
      <View
        style={{
          flexDirection: "row", alignItems: "center", gap: space.base,
          paddingHorizontal: GUTTER, paddingVertical: space.lg,
        }}
      >
        <View
          style={{
            width: 48, height: 48, borderRadius: 24, backgroundColor: color.accent,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 16, color: color.onAccent }}>
            {initials}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: color.ink }} numberOfLines={1}>
            {user?.name ?? "You"}
          </Text>
          <Text style={type.rowSub} numberOfLines={1}>{user?.email ?? ""}</Text>
        </View>
      </View>

      <StatStrip
        bordered
        items={[
          { label: "Space", value: <Val>{current.name}</Val> },
          { label: "Reports in", value: <Val>{baseCurrency}</Val> },
          { label: "Showing", value: <Val>{displayCurrency}</Val> },
        ]}
      />

      {/* ── Space ── */}
      <Label>Space</Label>
      <NavRow label="Spaces" sub="Switch or create a space" href="/spaces" />
      <Rule />
      <NavRow label="Members and invites" sub={isShared ? "Shared space" : "Invite someone"} href="/members" />

      {/* ── Currency ── */}
      <Label>Display currency</Label>
      <View
        style={{
          flexDirection: "row", flexWrap: "wrap", gap: space.sm,
          paddingHorizontal: GUTTER, paddingBottom: space.base,
        }}
      >
        {CURRENCY_CODES.map((c) => {
          const active = c === displayCurrency;
          return (
            <Pressable
              key={c}
              onPress={() => { Haptics.selectionAsync(); setDisplayCurrency(c); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                paddingHorizontal: space.md, paddingVertical: 7,
                borderRadius: radius.pill,
                backgroundColor: active ? color.ink : color.chip,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? color.onAccent : color.ink }}>
                {CURRENCIES[c].symbol}
              </Text>
              <Text style={{ fontSize: 12, color: active ? color.onAccent : color.faint }}>{c}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ ...type.rowSub, paddingHorizontal: GUTTER, paddingBottom: space.base, lineHeight: 16 }}>
        Changes what amounts are shown in. Your stored history keeps the rate each
        entry was made at, so past months never re-price.
      </Text>

      <Rule />
      <ToggleRow
        label="Hide decimals"
        sub="Whole naira only. Kobo rarely matters."
        value={prefs.hideDecimals}
        onChange={prefs.setHideDecimals}
      />
      <Rule />
      <ToggleRow
        label="Show base currency too"
        sub="Adds the space's reporting currency under converted amounts."
        value={prefs.showBaseCurrency}
        onChange={prefs.setShowBaseCurrency}
      />

      {/* ── Rates ── */}
      <Label
        action={
          <Pressable onPress={() => { Haptics.selectionAsync(); void refreshRates(); }} hitSlop={10}>
            <Text style={type.action}>Refresh</Text>
          </Pressable>
        }
      >
        Exchange rates
      </Label>
      {CURRENCY_CODES.filter((c) => c !== PIVOT).map((quote, i, arr) => (
        <View key={quote}>
          <RateRow from={PIVOT} to={quote} onSaved={refreshRates} />
          {i < arr.length - 1 && <Rule />}
        </View>
      ))}
      <Text style={{ ...type.rowSub, paddingHorizontal: GUTTER, paddingVertical: space.md, lineHeight: 16 }}>
        Auto rates as of {asOf}. Type your own if the rate you actually get
        differs — yours wins everywhere.
      </Text>

      {/* ── Preferences ── */}
      <Label>Preferences</Label>
      <ToggleRow
        label="Haptics"
        sub="Taps and confirmations give a small nudge."
        value={prefs.haptics}
        onChange={prefs.setHaptics}
      />
      <Rule />
      <ToggleRow
        label="Confirm income by default"
        sub="New income asks whether it landed instead of posting itself."
        value={prefs.confirmIncome}
        onChange={prefs.setConfirmIncome}
      />
      <Rule />
      <ToggleRow
        label="Sync on app open"
        sub="Off means changes only travel when you pull to refresh."
        value={prefs.autoSync}
        onChange={prefs.setAutoSync}
      />

      {/* ── Tools ── */}
      <Label>Tools</Label>
      <NavRow label="Currency converter" href="/converter" />
      <Rule />
      <NavRow label="Add a recurring item" href="/recurring-rule" />
      <Rule />
      <NavRow label="Set a budget" href="/budget-editor" />

      <AccountSection />

      <Text style={{ textAlign: "center", paddingVertical: space.xl, fontSize: 11, color: color.fainter }}>
        KoboTracker v1.0.0 · Made in Lagos 🇳🇬
      </Text>
    </ScrollView>
  );
}

function AccountSection() {
  const { signOut, deleteAccount } = useAuth();

  const confirmDelete = () => {
    Alert.alert(
      "Delete your account?",
      "This removes your account and personal data permanently. Shared spaces you do not own stay with their other members. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => void deleteAccount() },
      ]
    );
  };

  return (
    <>
      <Label>Account</Label>
      <Pressable
        onPress={() => void signOut()}
        style={{ paddingHorizontal: GUTTER, paddingVertical: space.base }}
      >
        <Text style={{ ...type.rowTitleLg, fontWeight: "600", color: color.ink }}>Sign out</Text>
      </Pressable>
      <Rule />
      {/* App Store review requires in-app account deletion wherever there is sign-in. */}
      <Pressable
        onPress={confirmDelete}
        style={{ paddingHorizontal: GUTTER, paddingVertical: space.base }}
      >
        <Text style={{ ...type.rowTitleLg, fontWeight: "600", color: color.danger }}>
          Delete account
        </Text>
      </Pressable>
      <Rule />
    </>
  );
}

const Val = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 14, color: color.ink }} numberOfLines={1}>
    {children}
  </Text>
);

function NavRow({ label, sub, href }: { label: string; sub?: string; href: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable
        style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: GUTTER, paddingVertical: space.base,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ ...type.rowTitleLg, color: color.ink }}>{label}</Text>
          {sub && <Text style={type.rowSub}>{sub}</Text>}
        </View>
        <Image source="sf:chevron.right" tintColor={color.fainter} style={{ width: 12, height: 12 }} />
      </Pressable>
    </Link>
  );
}

function ToggleRow({
  label, sub, value, onChange,
}: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: space.md,
        paddingHorizontal: GUTTER, paddingVertical: space.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.rowTitleLg, color: color.ink }}>{label}</Text>
        <Text style={{ ...type.rowSub, lineHeight: 15 }}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { Haptics.selectionAsync(); onChange(v); }}
        trackColor={{ true: color.accent, false: color.border }}
      />
    </View>
  );
}

function RateRow({ from, to, onSaved }: { from: Currency; to: Currency; onSaved: () => void }) {
  const { rates } = useSpace();
  const existing = rates.overrides?.[`${from}/${to}`];

  const auto = (() => {
    try {
      return rateFor(from, to, { perPivot: rates.perPivot });
    } catch {
      return null;
    }
  })();

  const [draft, setDraft] = useState(existing ? String(existing) : "");

  const commit = () => {
    const n = Number(draft.replace(/[,\s]/g, ""));
    setOverride(from, to, Number.isFinite(n) && n > 0 ? n : null);
    onSaved();
  };

  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: space.md,
        paddingHorizontal: GUTTER, paddingVertical: space.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.rowTitleLg, color: color.ink }}>1 {from} → {to}</Text>
        <Text style={{ ...type.rowSub, color: existing ? color.accent : color.faint }}>
          {existing
            ? `Your rate${auto ? ` · auto ${auto.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""}`
            : auto
              ? `Auto ${auto.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "No rate yet"}
        </Text>
      </View>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="decimal-pad"
        returnKeyType="done"
        placeholder={auto ? auto.toFixed(2) : "—"}
        placeholderTextColor={color.fainter}
        style={{
          fontSize: 14, color: color.ink, textAlign: "right", minWidth: 88,
          paddingVertical: 7, paddingHorizontal: space.md,
          backgroundColor: color.chip, borderRadius: radius.chip, ...CONTINUOUS,
        }}
      />
    </View>
  );
}
