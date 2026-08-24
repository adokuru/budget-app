import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Text, View,
} from "react-native";
import { Link, router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { PressableScale as Pressable } from "@/components/pressable-scale";
import { useAuth } from "@/state/auth";
import { Field } from "@/components/field";
import { Brand } from "@/components/logo";
import { color, space, GUTTER, radius, type, CONTINUOUS, DISPLAY_FONT } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};
const GOOGLE_FALLBACK_ID = "not-configured.apps.googleusercontent.com";
const GOOGLE_MARK = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.257c-.806.54-1.836.859-3.048.859-2.344 0-4.328-1.585-5.036-3.711H.956v2.333C2.437 15.984 5.482 18 9 18Z"/><path fill="#FBBC05" d="M3.964 10.711A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.169.282-1.711V4.956H.956A9.005 9.005 0 0 0 0 9c0 1.453.348 2.827.956 4.044l3.008-2.333Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.443 1.345l2.581-2.581C13.463.892 11.426 0 9 0 5.482 0 2.437 2.016.956 4.956l3.008 2.333C4.672 5.164 6.656 3.58 9 3.58Z"/></svg>'
)}`;

export default function SignInScreen() {
  const { signIn, signInWithApple, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "apple" | "google" | null>(null);
  const handledGoogleToken = useRef<string | null>(null);
  const activeGoogleClientId = process.env.EXPO_OS === "ios"
    ? GOOGLE_CLIENT_IDS.ios
    : process.env.EXPO_OS === "android"
      ? GOOGLE_CLIENT_IDS.android
      : GOOGLE_CLIENT_IDS.web;
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest(
    {
      iosClientId: GOOGLE_CLIENT_IDS.ios ?? GOOGLE_FALLBACK_ID,
      androidClientId: GOOGLE_CLIENT_IDS.android ?? GOOGLE_FALLBACK_ID,
      webClientId: GOOGLE_CLIENT_IDS.web ?? GOOGLE_FALLBACK_ID,
      selectAccount: true,
    },
    { scheme: "kobo", path: "oauthredirect" }
  );

  const canSubmit = email.includes("@") && password.length > 0 && busy === null;

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type !== "success") {
      setBusy(null);
      if (googleResponse.type === "error") {
        setError(googleResponse.error?.message ?? "Google sign-in failed");
      }
      return;
    }

    const idToken = googleResponse.params.id_token ?? googleResponse.authentication?.idToken;
    if (!idToken) {
      setError("Google did not return an identity token.");
      setBusy(null);
      return;
    }
    if (handledGoogleToken.current === idToken) return;
    handledGoogleToken.current = idToken;

    void (async () => {
      try {
        await signInWithGoogle(idToken);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/");
      } catch (e) {
        handledGoogleToken.current = null;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(e instanceof Error ? e.message : "Google sign-in failed");
        setBusy(null);
      }
    })();
  }, [googleResponse, signInWithGoogle]);

  async function submit() {
    if (!canSubmit) return;
    setBusy("email");
    setError(null);
    try {
      await signIn(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setBusy(null);
    }
  }

  async function withApple() {
    setBusy("apple");
    setError(null);
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
      if (e instanceof Error && e.message.toLowerCase().includes("cancel")) return;
      setError(e instanceof Error ? e.message : "Apple sign-in failed");
    } finally {
      setBusy(null);
    }
  }

  async function withGoogle() {
    if (!activeGoogleClientId) {
      setError("Google sign-in is not configured for this build yet.");
      return;
    }
    setBusy("google");
    setError(null);
    try {
      await promptGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: color.canvas }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 44, paddingBottom: space.huge, gap: space.base }}
        keyboardShouldPersistTaps="handled"
      >
        <Brand markSize={42} wordSize={22} />
        <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 30, lineHeight: 36, color: color.ink, marginTop: space.base }}>
          Know what is left.
        </Text>
        <Text style={{ ...type.body, color: color.body, marginBottom: space.md }}>
          Every naira accounted for. Plan every bill and see what is safe to spend this month.
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
          {busy === "email"
            ? <ActivityIndicator color={color.onAccent} />
            : <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 15,
                             color: canSubmit ? color.onAccent : color.faint }}>
                Sign in
              </Text>}
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginVertical: space.xs }}>
          <View style={{ flex: 1, height: 1, backgroundColor: color.hairline }} />
          <Text style={type.meta}>or continue with</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: color.hairline }} />
        </View>

        <Pressable
          onPress={withGoogle}
          disabled={busy !== null || !googleRequest}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          style={{
            height: 50, borderRadius: radius.chip, ...CONTINUOUS,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
            backgroundColor: color.surface, borderWidth: 1, borderColor: "#747775",
            opacity: busy !== null || !googleRequest ? 0.55 : 1,
          }}
        >
          {busy === "google"
            ? <ActivityIndicator color={color.ink} />
            : <>
                <Image source={GOOGLE_MARK} style={{ width: 18, height: 18 }} />
                <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#1F1F1F" }}>
                  Continue with Google
                </Text>
              </>}
        </Pressable>

        {process.env.EXPO_OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={{ height: 50, opacity: busy !== null ? 0.55 : 1 }}
            onPress={withApple}
          />
        )}

        <Link href="/(auth)/sign-up" asChild>
          <Pressable style={{ alignItems: "center", paddingVertical: space.base }}>
            <Text style={type.action}>New to Kobo Tracker? Create an account</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
