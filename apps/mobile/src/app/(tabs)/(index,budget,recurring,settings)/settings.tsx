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
import { color, space, radius, type, CONTINUOUS } from "@/theme/tokens";

export default function SettingsScreen() {
  const {
    space: current, baseCurrency, displayCurrency, setDisplayCurrency, rates, refreshRates,
    hideBalances, setHideBalances, showMinorUnits, setShowMinorUnits,
  } = useSpace();

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
        <NavRow label="Switch space" value={current.name} href="/spaces" />
        <NavRow label="Members and invites" value="" href="/members" />
        <Row label="Reports in" value={`${baseCurrency} · ${CURRENCIES[baseCurrency].name}`} />
      </Group>

      <Group title="Display currency" caption="Changes what amounts are shown in. Your stored history is untouched.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, padding: space.base }}>
          {CURRENCY_CODES.map((c) => {
            const active = c === displayCurrency;
            return (
              <Pressable
                key={c}
                onPress={() => { Haptics.selectionAsync(); setDisplayCurrency(c); }}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  height: 36, paddingHorizontal: space.md,
                  borderRadius: radius.pill,
                  backgroundColor: active ? color.ink : color.hairline,
                }}
              >
                <Text style={{ ...type.label, fontWeight: "600", color: active ? color.onInk : color.ink }}>
                  {CURRENCIES[c].symbol} {c}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Group>

      <Group title="Appearance & privacy">
        <Row label="Theme" value="Kobo blue" />
        <ToggleRow
          label="Hide balances"
          caption="Mask money throughout the app"
          value={hideBalances}
          onValueChange={setHideBalances}
        />
        <ToggleRow
          label="Show cents"
          caption="Include minor units in money totals"
          value={showMinorUnits}
          onValueChange={setShowMinorUnits}
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
          onPress={() => { Haptics.selectionAsync(); void refreshRates(true); }}
          style={{ padding: space.base, borderTopWidth: 1, borderTopColor: color.hairline }}
        >
          <Text style={{ ...type.label, color: color.accent, fontWeight: "600" }}>
            Refresh rates now
          </Text>
        </Pressable>
      </Group>

      <Group title="Tools">
        <NavRow label="Currency converter" value="" href="/converter" />
      </Group>

      <AccountGroup />
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
      <Row label="Signed in as" value={user?.email ?? ""} />
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

function NavRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable
        style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          gap: space.md, padding: space.base,
        }}
      >
        <Text style={{ ...type.body, color: color.ink }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          {value ? <Text style={{ ...type.body, color: color.muted }}>{value}</Text> : null}
          <Image source="sf:chevron.right" tintColor={color.muted} style={{ width: 12, height: 12 }} />
        </View>
      </Pressable>
    </Link>
  );
}

function RateRow({
  from, to, onSaved,
}: { from: Currency; to: Currency; onSaved: () => void }) {
  const { rates } = useSpace();
  const overrideKey = `${from}/${to}`;
  const existing = rates.overrides?.[overrideKey];

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
      <Text style={{ ...type.micro, color: color.muted }}>{title}</Text>
      <View style={{
        backgroundColor: color.card, borderRadius: radius.card, ...CONTINUOUS,
        borderWidth: 1, borderColor: color.stroke,
      }}>
        {children}
      </View>
      {caption && (
        <Text style={{ ...type.caption, color: color.muted, paddingHorizontal: space.xs }}>
          {caption}
        </Text>
      )}
    </View>
  );
}

function ToggleRow({
  label, caption, value, onValueChange,
}: { label: string; caption: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: space.md,
      padding: space.base, borderTopWidth: 1, borderTopColor: color.hairline,
    }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...type.body, color: color.ink }}>{label}</Text>
        <Text style={{ ...type.caption, color: color.muted }}>{caption}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: color.accent }} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        padding: space.base,
      }}
    >
      <Text style={{ ...type.body, color: color.ink }}>{label}</Text>
      <Text style={{ ...type.body, color: color.muted }}>{value}</Text>
    </View>
  );
}
