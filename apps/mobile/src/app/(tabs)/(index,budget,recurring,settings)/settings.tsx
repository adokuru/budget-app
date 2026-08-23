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
import { setOverride } from "@/lib/rates";
import { usePrefs } from "@/state/prefs";
import { color, space, radius, type, CONTINUOUS, tint } from "@/theme/tokens";

export default function SettingsScreen() {
  const { space: current, baseCurrency, displayCurrency, setDisplayCurrency, rates, refreshRates } =
    useSpace();
  const prefs = usePrefs();

  const asOf = rates.fetchedAt
    ? new Date(rates.fetchedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : "not fetched yet";

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: 140 }}
    >
      <Group title="Space">
        <NavRow icon="rectangle.2.swap" tone="#7C6BFF"
                label="Switch space" value={current.name} href="/spaces" />
        <NavRow icon="person.2.fill" tone="#3B82F6"
                label="Members and invites" href="/members" />
        <Row icon="chart.bar.fill" tone="#2E9E6B"
             label="Reports in" value={`${baseCurrency} · ${CURRENCIES[baseCurrency].name}`} />
      </Group>

      <Group
        title="Currency"
        caption="Changes what amounts are shown in. Your stored history is untouched — every transaction keeps the rate it was entered at."
      >
        <View style={{ padding: space.base, gap: space.sm }}>
          <Text style={{ ...type.caption, color: color.muted }}>Display currency</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {CURRENCY_CODES.map((c) => {
              const active = c === displayCurrency;
              return (
                <Pressable
                  key={c}
                  onPress={() => { Haptics.selectionAsync(); setDisplayCurrency(c); }}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 5,
                    height: 38, paddingHorizontal: space.base,
                    borderRadius: radius.pill,
                    backgroundColor: active ? color.accent : color.canvas,
                  }}
                >
                  <Text style={{ ...type.label, fontWeight: "700",
                                 color: active ? color.onAccent : color.ink }}>
                    {CURRENCIES[c].symbol}
                  </Text>
                  <Text style={{ ...type.label, color: active ? color.onAccent : color.muted }}>
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ToggleRow
          icon="eye.slash.fill" tone="#6B6B76"
          label="Hide decimals"
          caption="Whole naira only. Kobo rarely matters."
          value={prefs.hideDecimals}
          onChange={prefs.setHideDecimals}
        />
        <ToggleRow
          icon="arrow.left.arrow.right" tone="#14B8A6"
          label="Show base currency too"
          caption="Adds the space's reporting currency under converted amounts."
          value={prefs.showBaseCurrency}
          onChange={prefs.setShowBaseCurrency}
        />
      </Group>

      <Group
        title="Exchange rates"
        caption={`Auto rates from open.er-api.com, as of ${asOf}. Type your own if the rate you actually get differs — yours wins everywhere.`}
      >
        {CURRENCY_CODES.filter((c) => c !== PIVOT).map((quote) => (
          <RateRow key={quote} from={PIVOT} to={quote} onSaved={refreshRates} />
        ))}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); void refreshRates(); }}
          style={{ padding: space.base, borderTopWidth: 1, borderTopColor: color.hairline }}
        >
          <Text style={{ ...type.label, color: color.accent, fontWeight: "600" }}>
            Refresh rates now
          </Text>
        </Pressable>
      </Group>

      <Group title="Behaviour">
        <ToggleRow
          icon="hand.tap.fill" tone="#F5A524"
          label="Haptics"
          caption="Taps and confirmations give a small nudge."
          value={prefs.haptics}
          onChange={prefs.setHaptics}
        />
        <ToggleRow
          icon="bell.badge.fill" tone="#EC4899"
          label="Confirm salary by default"
          caption="New income items ask whether they landed instead of posting themselves."
          value={prefs.confirmIncome}
          onChange={prefs.setConfirmIncome}
        />
        <ToggleRow
          icon="arrow.triangle.2.circlepath" tone="#3B82F6"
          label="Sync on app open"
          caption="Off means changes only travel when you pull to refresh."
          value={prefs.autoSync}
          onChange={prefs.setAutoSync}
        />
      </Group>

      <Group title="Tools">
        <NavRow icon="arrow.left.arrow.right.circle.fill" tone="#14B8A6"
                label="Currency converter" href="/converter" />
        <NavRow icon="repeat.circle.fill" tone="#8B5CF6"
                label="Add a recurring item" href="/recurring-rule" />
        <NavRow icon="target" tone="#00A860"
                label="Set a budget" href="/budget-editor" />
      </Group>

      <AccountGroup />

      <Text style={{ ...type.caption, color: color.faint, textAlign: "center" }}>
        Kobo Tracker · every naira accounted for
      </Text>
    </ScrollView>
  );
}

function AccountGroup() {
  const { user, signOut, deleteAccount } = useAuth();

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
    <Group title="Account">
      <Row icon="person.crop.circle.fill" tone="#6B6B76"
           label="Signed in as" value={user?.email ?? ""} />
      <Pressable
        onPress={() => void signOut()}
        style={{ padding: space.base, borderTopWidth: 1, borderTopColor: color.hairline }}
      >
        <Text style={{ ...type.body, color: color.ink }}>Sign out</Text>
      </Pressable>
      {/* App Store review requires in-app account deletion wherever there is sign-in. */}
      <Pressable
        onPress={confirmDelete}
        style={{ padding: space.base, borderTopWidth: 1, borderTopColor: color.hairline }}
      >
        <Text style={{ ...type.body, color: color.danger }}>Delete account</Text>
      </Pressable>
    </Group>
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
        padding: space.base, borderTopWidth: 1, borderTopColor: color.hairline,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...type.body, color: color.ink }}>1 {from} → {to}</Text>
        <Text style={{ ...type.caption, color: existing ? color.accent : color.muted }}>
          {existing
            ? `Using your rate${auto ? ` · auto says ${auto.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""}`
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
        placeholderTextColor={color.hairline}
        style={{
          ...type.body, color: color.ink, textAlign: "right",
          minWidth: 96, paddingVertical: 8, paddingHorizontal: space.md,
          backgroundColor: color.canvas, borderRadius: radius.chip, ...CONTINUOUS,
        }}
      />
    </View>
  );
}

function Group({
  title, caption, children,
}: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={{ ...type.micro, color: color.faint }}>{title}</Text>
      <View style={{ backgroundColor: color.card, borderRadius: radius.card, ...CONTINUOUS,
                     overflow: "hidden" }}>
        {children}
      </View>
      {caption && (
        <Text style={{ ...type.caption, color: color.faint, paddingHorizontal: space.xs,
                       lineHeight: 17 }}>
          {caption}
        </Text>
      )}
    </View>
  );
}

function Glyph({ icon, tone }: { icon: string; tone: string }) {
  return (
    <View
      style={{
        width: 28, height: 28, borderRadius: 9, ...CONTINUOUS,
        backgroundColor: tint(tone, 0.14),
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Image source={`sf:${icon}`} tintColor={tone} style={{ width: 14, height: 14 }} />
    </View>
  );
}

function Row({
  icon, tone, label, value,
}: { icon: string; tone: string; label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: space.md, padding: space.base,
      }}
    >
      <Glyph icon={icon} tone={tone} />
      <Text style={{ ...type.body, color: color.ink, flex: 1 }}>{label}</Text>
      <Text style={{ ...type.body, color: color.muted }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function NavRow({
  icon, tone, label, value, href,
}: { icon: string; tone: string; label: string; value?: string; href: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable
        style={{
          flexDirection: "row", alignItems: "center", gap: space.md, padding: space.base,
          borderTopWidth: 0, borderTopColor: color.hairline,
        }}
      >
        <Glyph icon={icon} tone={tone} />
        <Text style={{ ...type.body, color: color.ink, flex: 1 }}>{label}</Text>
        {value ? <Text style={{ ...type.body, color: color.muted }}>{value}</Text> : null}
        <Image source="sf:chevron.right" tintColor={color.faint} style={{ width: 11, height: 11 }} />
      </Pressable>
    </Link>
  );
}

function ToggleRow({
  icon, tone, label, caption, value, onChange,
}: {
  icon: string; tone: string; label: string; caption: string;
  value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: space.md, padding: space.base,
        borderTopWidth: 1, borderTopColor: color.hairline,
      }}
    >
      <Glyph icon={icon} tone={tone} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ ...type.body, color: color.ink }}>{label}</Text>
        <Text style={{ ...type.caption, color: color.faint, lineHeight: 16 }}>{caption}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { Haptics.selectionAsync(); onChange(v); }}
        trackColor={{ true: color.accent }}
      />
    </View>
  );
}
