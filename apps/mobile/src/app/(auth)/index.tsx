import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Text, View,
} from "react-native";
import { Link, router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useAuth } from "@/state/auth";
import { Field } from "@/components/field";
import { Wordmark } from "@/components/logo";
import { color, space, GUTTER, radius, type, CONTINUOUS, DISPLAY_FONT } from "@/theme/tokens";

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
      // Apple sends the name only on first authorization, so forward it now
      // or lose it forever.
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
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 80, gap: space.base }}
        keyboardShouldPersistTaps="handled"
      >
        <Wordmark size={30} />
        <Text style={{ ...type.meta, marginBottom: space.lg }}>
          Every naira accounted for.
        </Text>

        <Field label="Email" value={email} onChange={setEmail}
               keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
        <Field label="Password" value={password} onChange={setPassword}
               secureTextEntry autoComplete="current-password" onSubmit={submit} />

        {error && (
          <Text selectable style={{ ...type.body, color: color.danger }}>{error}</Text>
        )}

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={{
            height: 50, borderRadius: radius.card, ...CONTINUOUS,
            alignItems: "center", justifyContent: "center", marginTop: space.sm,
            backgroundColor: canSubmit ? color.ink : color.hairline,
          }}
        >
          {busy
            ? <ActivityIndicator color={color.onAccent} />
            : <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 15,
                             color: canSubmit ? color.onAccent : color.faint }}>
                Sign in
              </Text>}
        </Pressable>

        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={{ height: 50 }}
          onPress={withApple}
        />

        <Link href="/(auth)/sign-up" asChild>
          <Pressable style={{ alignItems: "center", paddingVertical: space.base }}>
            <Text style={type.action}>Create an account</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
