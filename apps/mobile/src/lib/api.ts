import { readTokens, saveTokens, clearTokens, deviceId, type SessionUser } from "./session";

/**
 * The dev server runs on the host machine. On a simulator localhost resolves
 * to the Mac; on a real device it must be the Mac's LAN address, which
 * EXPO_PUBLIC_API_URL provides.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const PLATFORM = process.env.EXPO_OS ?? "ios";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  /** Internal: stops a refresh failure from recursing forever. */
  retrying?: boolean;
};

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, auth = true, retrying = false } = opts;
  const headers: Record<string, string> = { "content-type": "application/json" };

  if (auth) {
    const { access } = await readTokens();
    if (access) headers.authorization = `Bearer ${access}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // An access token lasts 15 minutes, so this path is hit constantly. Refresh
  // once and replay; if the refresh itself fails, the session is genuinely over.
  if (res.status === 401 && auth && !retrying) {
    const refreshed = await tryRefresh();
    if (refreshed) return api<T>(path, { ...opts, retrying: true });
    await clearTokens();
    throw new ApiError(401, "Your session expired. Sign in again.");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed = text ? safeJson(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, messageFrom(parsed) ?? "Something went wrong. Try again.", parsed);
  }
  return parsed as T;
}

async function tryRefresh(): Promise<boolean> {
  const { refresh } = await readTokens();
  if (!refresh) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh, deviceId: deviceId() }),
  });
  if (!res.ok) return false;

  const session = (await res.json()) as { accessToken: string; refreshToken: string };
  await saveTokens(session.accessToken, session.refreshToken);
  return true;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFrom(body: unknown): string | null {
  if (typeof body === "string") return body;
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === "string") return m;
    if (Array.isArray(m)) return m.join(", ");
  }
  return null;
}

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api<AuthResponse>("/auth/register", {
      method: "POST", auth: false,
      body: { email, password, name, deviceId: deviceId(), platform: PLATFORM },
    }),

  login: (email: string, password: string) =>
    api<AuthResponse>("/auth/login", {
      method: "POST", auth: false,
      body: { email, password, deviceId: deviceId(), platform: PLATFORM },
    }),

  apple: (idToken: string, name?: string) =>
    api<AuthResponse>("/auth/apple", {
      method: "POST", auth: false,
      body: { idToken, name, deviceId: deviceId(), platform: PLATFORM },
    }),

  google: (idToken: string) =>
    api<AuthResponse>("/auth/google", {
      method: "POST", auth: false,
      body: { idToken, deviceId: deviceId(), platform: PLATFORM },
    }),

  logout: () => api<void>("/auth/logout", { method: "POST" }),
  deleteAccount: () => api<void>("/auth/account", { method: "DELETE" }),
};

export type SpaceSummary = {
  id: string;
  name: string;
  baseCurrency: string;
  role: "owner" | "member" | "viewer";
};

export type Member = {
  id: string; name: string; email: string;
  avatarUrl: string | null; role: string; joinedAt: string;
};

export const spacesApi = {
  list: () => api<SpaceSummary[]>("/spaces"),
  create: (name: string, baseCurrency: string) =>
    api<SpaceSummary>("/spaces", { method: "POST", body: { name, baseCurrency } }),
  members: (id: string) => api<Member[]>(`/spaces/${id}/members`),
  invite: (id: string, role: "member" | "viewer") =>
    api<{ code: string; expiresAt: string }>(`/spaces/${id}/invites`, {
      method: "POST", body: { role },
    }),
  join: (code: string) => api<SpaceSummary>("/spaces/join", { method: "POST", body: { code } }),
  removeMember: (spaceId: string, userId: string) =>
    api<void>(`/spaces/${spaceId}/members/${userId}`, { method: "DELETE" }),
  updateMemberRole: (spaceId: string, userId: string, role: "member" | "viewer") =>
    api<{ role: "member" | "viewer" }>(`/spaces/${spaceId}/members/${userId}`, {
      method: "PATCH", body: { role },
    }),
};
