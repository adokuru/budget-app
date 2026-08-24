import { Alert, ScrollView, Text, View } from "react-native";
import { CURRENCIES } from "@budget/shared";
import { useSpace } from "@/state/space";
import { useAuth } from "@/state/auth";
import { usePrefs } from "@/state/prefs";
import { AppHeader } from "@/components/app-header";
import { Rule, Label, SectionCard, StatStrip } from "@/components/primitives";
import { SettingsNavRow, SettingsToggleRow } from "@/components/settings-row";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useTheme } from "@/hooks/use-theme";
import { formatReminderTime } from "@/lib/reminders";
import { space, GUTTER, radius, CONTINUOUS, DISPLAY_FONT } from "@/theme/tokens";

const APPEARANCE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export default function SettingsScreen() {
  const { color, type } = useTheme();
  const {
    space: current, isShared, baseCurrency, displayCurrency,
  } = useSpace();
  const { user } = useAuth();
  const prefs = usePrefs();

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
      <SectionCard style={{ marginTop: space.sm }}>
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
      </SectionCard>

      {/* ── Account ── */}
      <Label>Account</Label>
      <SectionCard>
        <SettingsNavRow label="Spaces" sub="Switch or create a space" href="/spaces" />
        <Rule full />
        <SettingsNavRow
          label="Currency"
          sub={`${CURRENCIES[displayCurrency].name} (${CURRENCIES[displayCurrency].symbol})`}
          href="/currency"
        />
        <Rule full />
        <SettingsNavRow label="Members and invites" sub={isShared ? "Shared space" : "Invite someone"} href="/members" />
      </SectionCard>

      {/* ── Preferences ── */}
      <Label>Preferences</Label>
      <SectionCard>
        <SettingsNavRow
          label="Notifications"
          sub={prefs.dailyReminderEnabled || prefs.recurringReminderEnabled
            ? `On · ${formatReminderTime(prefs.reminderHour, prefs.reminderMinute)}`
            : "Off"}
          href="/reminders"
        />
        <Rule full />
        <SettingsNavRow
          label="Widgets"
          sub="Track this month's budget from the Home Screen"
          href="/widgets"
        />
        <Rule full />
        <SettingsToggleRow
          label="Haptics"
          sub="Taps and confirmations give a small nudge."
          value={prefs.haptics}
          onChange={prefs.setHaptics}
        />
        <Rule full />
        <SettingsToggleRow
          label="Confirm income by default"
          sub="New income asks whether it landed instead of posting itself."
          value={prefs.confirmIncome}
          onChange={prefs.setConfirmIncome}
        />
        <Rule full />
        <SettingsToggleRow
          label="Sync on app open"
          sub="Off means changes only travel when you pull to refresh."
          value={prefs.autoSync}
          onChange={prefs.setAutoSync}
        />
      </SectionCard>

      <Label>Appearance</Label>
      <SectionCard style={{ padding: space.xs }}>
        <View style={{ flexDirection: "row", gap: space.xs }}>
          {APPEARANCE_OPTIONS.map((option) => {
            const selected = prefs.appearance === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={`${option.label} appearance`}
                accessibilityState={{ checked: selected }}
                onPress={() => prefs.setAppearance(option.value)}
                style={{
                  flex: 1,
                  minHeight: 42,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.chip,
                  backgroundColor: selected ? color.accent : color.surface,
                  ...CONTINUOUS,
                }}
              >
                <Text style={{ ...type.rowTitle, fontWeight: "700", color: selected ? color.onAccent : color.body }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>
      <Text style={{ ...type.rowSub, paddingHorizontal: GUTTER, paddingTop: space.sm }}>
        System follows this device. Your choice stays on this phone.
      </Text>

      {/* ── Planning ── */}
      <Label>Planning</Label>
      <SectionCard>
        <SettingsNavRow label="Add a recurring item" href="/recurring-rule" />
        <Rule full />
        <SettingsNavRow label="Set a budget" href="/budget-editor" />
      </SectionCard>

      <AccountSection />

      <Text style={{ textAlign: "center", paddingVertical: space.xl, fontSize: 11, color: color.fainter }}>
        KoboTracker v1.0.0 · Made in Lagos 🇳🇬
      </Text>
    </ScrollView>
  );
}

function AccountSection() {
  const { color, type } = useTheme();
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
      <Label>Privacy & access</Label>
      <SectionCard>
        <Pressable
          onPress={() => void signOut()}
          style={{ paddingHorizontal: GUTTER, paddingVertical: space.base }}
        >
          <Text style={{ ...type.rowTitleLg, fontWeight: "600", color: color.ink }}>Sign out</Text>
        </Pressable>
        <Rule full />
        {/* App Store review requires in-app account deletion wherever there is sign-in. */}
        <Pressable
          onPress={confirmDelete}
          style={{ paddingHorizontal: GUTTER, paddingVertical: space.base }}
        >
          <Text style={{ ...type.rowTitleLg, fontWeight: "600", color: color.danger }}>
            Delete account
          </Text>
        </Pressable>
      </SectionCard>
    </>
  );
}

function Val({ children }: { children: React.ReactNode }) {
  const { color } = useTheme();
  return (
    <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 14, color: color.ink }} numberOfLines={1}>
      {children}
    </Text>
  );
}
