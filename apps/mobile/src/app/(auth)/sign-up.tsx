import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, View,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/state/auth";
import { Field } from "@/components/field";
import { Logo } from "@/components/logo";
import { color, space, radius, type, MONEY_FONT } from "@/theme/tokens";

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = password.length > 0 && password.length < 10;
  const canSubmit = name.trim().length > 0 && email.includes("@") && password.length >= 10 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signUp(email, password, name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : "Could not create your account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: color.canvas }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.lg, gap: space.base, paddingTop: space.huge }}
        keyboardShouldPersistTaps="handled"
      >
        <Logo size={56} />
        <Text style={{ fontFamily: MONEY_FONT, fontSize: 30, color: color.ink, marginTop: space.sm }}>
          Create account
        </Text>
        <Text style={{ ...type.body, color: color.muted, marginBottom: space.sm }}>
          You start with a private Personal space. Shared ones come later.
        </Text>

        <Field label="Name" value={name} onChange={setName} autoComplete="name" />
        <Field label="Email" value={email} onChange={setEmail}
               keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChange={setPassword}
               secureTextEntry autoComplete="new-password" onSubmit={submit} />

        <Text style={{ ...type.caption, color: tooShort ? color.danger : color.muted }}>
          At least 10 characters. Length beats symbols — a short phrase you can
          remember is stronger than P@ssw0rd.
        </Text>

        {error && (
          <Text selectable style={{ ...type.caption, color: color.danger }}>{error}</Text>
        )}

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={{
            height: 50, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
            backgroundColor: canSubmit ? color.accent : color.hairline, marginTop: space.sm,
          }}
        >
          {busy
            ? <ActivityIndicator color={color.onAccent} />
            : <Text style={{ ...type.body, fontWeight: "600", color: canSubmit ? color.onAccent : color.muted }}>
                Create account
              </Text>}
        </Pressable>

        <Pressable onPress={() => router.back()} style={{ alignItems: "center", paddingVertical: space.md }}>
          <Text style={{ ...type.body, color: color.accent }}>I already have an account</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
