import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { CURRENCIES } from "@budget/shared";
import { useSpace } from "@/state/space";
import { useAuth } from "@/state/auth";
import { usePrefs } from "@/state/prefs";
import { AppHeader } from "@/components/app-header";
import { Rule, Label, StatStrip } from "@/components/primitives";
import { SettingsNavRow, SettingsToggleRow } from "@/components/settings-row";
import { color, space, GUTTER, type, DISPLAY_FONT } from "@/theme/tokens";

export default function SettingsScreen() {
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

      {/* ── Account ── */}
      <Label>Account</Label>
      <SettingsNavRow label="Spaces" sub="Switch or create a space" href="/spaces" />
      <Rule />
      <SettingsNavRow
        label="Currency"
        sub={`${CURRENCIES[displayCurrency].name} (${CURRENCIES[displayCurrency].symbol})`}
        href="/currency"
      />
      <Rule />
      <SettingsNavRow label="Members and invites" sub={isShared ? "Shared space" : "Invite someone"} href="/members" />

      {/* ── Preferences ── */}
      <Label>Preferences</Label>
      <SettingsToggleRow
        label="Haptics"
        sub="Taps and confirmations give a small nudge."
        value={prefs.haptics}
        onChange={prefs.setHaptics}
      />
      <Rule />
      <SettingsToggleRow
        label="Confirm income by default"
        sub="New income asks whether it landed instead of posting itself."
        value={prefs.confirmIncome}
        onChange={prefs.setConfirmIncome}
      />
      <Rule />
      <SettingsToggleRow
        label="Sync on app open"
        sub="Off means changes only travel when you pull to refresh."
        value={prefs.autoSync}
        onChange={prefs.setAutoSync}
      />

      {/* ── Planning ── */}
      <Label>Planning</Label>
      <SettingsNavRow label="Add a recurring item" href="/recurring-rule" />
      <Rule />
      <SettingsNavRow label="Set a budget" href="/budget-editor" />

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
      <Label>Privacy & access</Label>
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
