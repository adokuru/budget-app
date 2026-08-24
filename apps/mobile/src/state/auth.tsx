import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { database } from "@/db";
import { authApi, type AuthResponse } from "@/lib/api";
import { clearTokens, readTokens, readUser, saveTokens, saveUser, type SessionUser }
  from "@/lib/session";
import { sync } from "@/lib/sync";

type AuthValue = {
  user: SessionUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithApple: (idToken: string, name?: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { access, refresh } = await readTokens();
      if (access && refresh) setUser(readUser());
      setReady(true);
    })();
  }, []);

  const adopt = useCallback(async (res: AuthResponse) => {
    // Wipe first. Anything already on this device belongs to a different
    // session, and pushing it into the new account would attribute one
    // person's spending to another — or fail on a space they cannot see.
    await database.write(() => database.unsafeResetDatabase());

    await saveTokens(res.accessToken, res.refreshToken);
    saveUser(res.user);
    setUser(res.user);
    // First sync brings down the Personal space the server seeded at signup.
    await sync();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Signing out locally must work even with no network.
    }
    await clearTokens();
    saveUser(null);
    setUser(null);
    // Unmount database observers before clearing the account-owned store.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    // Local data belongs to the account that was signed in — leaving it would
    // show the next person on this device someone else's finances.
    await database.write(() => database.unsafeResetDatabase());
  }, []);

  return (
    <AuthContext
      value={{
        user,
        ready,
        signIn: async (e, p) => adopt(await authApi.login(e, p)),
        signUp: async (e, p, n) => adopt(await authApi.register(e, p, n)),
        signInWithApple: async (t, n) => adopt(await authApi.apple(t, n)),
        signInWithGoogle: async (t) => adopt(await authApi.google(t)),
        signOut,
        deleteAccount: async () => {
          await authApi.deleteAccount();
          await signOut();
        },
      }}
    >
      {children}
    </AuthContext>
  );
}
