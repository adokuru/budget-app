import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { readJson, writeJson } from "./store";

const ACCESS_KEY = "kobo.access";
const REFRESH_KEY = "kobo.refresh";
const DEVICE_FILE = "device-id.json";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

/**
 * Tokens live in the Keychain, never in a plain file. The device id does not,
 * because it is not a secret and must survive a Keychain reset — the server
 * keys the refresh token to it.
 */
export async function saveTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function readTokens(): Promise<{ access: string | null; refresh: string | null }> {
  return {
    access: await SecureStore.getItemAsync(ACCESS_KEY),
    refresh: await SecureStore.getItemAsync(REFRESH_KEY),
  };
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export function deviceId(): string {
  const existing = readJson<{ id: string }>(DEVICE_FILE);
  if (existing?.id) return existing.id;
  const id = `device-${randomUUID()}`;
  writeJson(DEVICE_FILE, { id });
  return id;
}

const USER_FILE = "session-user.json";

export const saveUser = (u: SessionUser | null) => writeJson(USER_FILE, u);
export const readUser = () => readJson<SessionUser>(USER_FILE);

/**
 * The signed-in user's id, for stamping created_by locally. The server
 * overwrites it from the token on push, so this only has to be right enough
 * for the row to render with the correct avatar before it syncs.
 */
export function currentUserId(): string {
  return readUser()?.id ?? "pending";
}
