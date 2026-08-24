import { z } from "zod";

/**
 * Request validation is zod, shared in shape with the client, rather than
 * class-validator decorators. One schema language across the whole repo.
 */
export const registerSchema = z.object({
  email: z.string().email().max(320).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(10).max(1024),
  name: z.string().min(1).max(80).transform((s) => s.trim()),
  deviceId: z.string().min(8).max(64),
  platform: z.enum(["ios", "android", "web"]).default("ios"),
});

export const loginSchema = z.object({
  email: z.string().email().max(320).transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1).max(1024),
  deviceId: z.string().min(8).max(64),
  platform: z.enum(["ios", "android", "web"]).default("ios"),
});

export const oauthSchema = z.object({
  idToken: z.string().min(20).max(8192),
  /** Apple only sends this on first authorization, so the client forwards it. */
  name: z.string().min(1).max(80).optional(),
  deviceId: z.string().min(8).max(64),
  platform: z.enum(["ios", "android", "web"]).default("ios"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(512),
  deviceId: z.string().min(8).max(64),
});

export const joinSchema = z.object({
  code: z.string().length(6).transform((s) => s.toUpperCase()),
});

export const createInviteSchema = z.object({
  role: z.enum(["member", "viewer"]).default("member"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["member", "viewer"]),
});

export const createSpaceSchema = z.object({
  name: z.string().min(1).max(60).transform((s) => s.trim()),
  baseCurrency: z.enum(["NGN", "USD", "CAD", "EUR"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OAuthInput = z.infer<typeof oauthSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
