import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Text,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useAuth } from "@/state/auth";
import { Field } from "@/components/field";
import { Brand } from "@/components/logo";
import { useTheme } from "@/hooks/use-theme";
import { space, GUTTER, radius, CONTINUOUS, DISPLAY_FONT } from "@/theme/tokens";

export default function SignUpScreen() {
  const { color, type } = useTheme();
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
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 52, paddingBottom: space.huge, gap: space.base }}
        keyboardShouldPersistTaps="handled"
      >
        <Brand markSize={42} wordSize={22} />
        <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 30, lineHeight: 36, color: color.ink, marginTop: space.base }}>
          Start with a clear month.
        </Text>
        <Text style={{ ...type.body, color: color.body, marginBottom: space.md }}>
          Create your private budget first. Invite family when you are ready.
        </Text>

        <Field label="Name" value={name} onChange={setName} autoComplete="name" />
        <Field label="Email" value={email} onChange={setEmail}
               keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChange={setPassword}
               secureTextEntry autoComplete="new-password" onSubmit={submit} />

        <Text style={{ ...type.rowSub, color: tooShort ? color.danger : color.faint, lineHeight: 17 }}>
          Use at least 10 characters. A short phrase is easiest to remember.
        </Text>

        {error && (
          <Text selectable style={{ ...type.body, color: color.danger }}>{error}</Text>
        )}

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={{
            height: 50, borderRadius: radius.card, ...CONTINUOUS,
            alignItems: "center", justifyContent: "center", marginTop: space.sm,
            backgroundColor: canSubmit || busy ? color.accent : color.hairline,
          }}
        >
          {busy
            ? <ActivityIndicator color={color.onAccent} />
            : <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 15,
                             color: canSubmit ? color.onAccent : color.faint }}>
                Create account
              </Text>}
        </Pressable>

        <Pressable onPress={() => router.replace("/(auth)/sign-in")} style={{ alignItems: "center", paddingVertical: space.base }}>
          <Text style={type.action}>Already have an account? Sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
