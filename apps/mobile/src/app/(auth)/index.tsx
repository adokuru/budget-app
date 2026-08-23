import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text,
} from "react-native";
import { Link, router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/state/auth";
import { Field } from "@/components/field";
import { color, space, radius, type, MONEY_FONT } from "@/theme/tokens";

export default function SignInScreen() {
  const { signIn, signInWithApple } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.includes("@") && password.length > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function withApple() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple did not return a token");
      // Apple sends the name only on the first authorization, so it is
      // forwarded now or lost forever.
      const name = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean).join(" ") || undefined;
      await signInWithApple(credential.identityToken, name);
      router.replace("/");
    } catch (e) {
      if (e instanceof Error && e.message.includes("canceled")) return;
      setError(e instanceof Error ? e.message : "Apple sign-in failed");
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: color.canvas }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: space.lg, gap: space.base, paddingTop: space.huge }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontFamily: MONEY_FONT, fontSize: 40, color: color.ink }}>Kobo Tracker</Text>
        <Text style={{ ...type.body, color: color.muted, marginBottom: space.base }}>
          Every naira accounted for.
        </Text>

        <Field label="Email" value={email} onChange={setEmail}
               keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChange={setPassword}
               secureTextEntry autoComplete="current-password" onSubmit={submit} />

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
                Sign in
              </Text>}
        </Pressable>

        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={25}
          style={{ height: 50 }}
          onPress={withApple}
        />

        <Link href="/(auth)/sign-up" asChild>
          <Pressable style={{ alignItems: "center", paddingVertical: space.md }}>
            <Text style={{ ...type.body, color: color.accent }}>Create an account</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
