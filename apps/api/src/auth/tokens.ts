import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export type AccessClaims = { sub: string; did: string };

const ACCESS_TTL = "15m";
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function secretKey(secret: string): Uint8Array {
  if (!secret || secret.length < 32) {
    // Failing loudly beats signing every token in production with "dev".
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  claims: AccessClaims,
  secret: string
): Promise<string> {
  return new SignJWT({ did: claims.did })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secretKey(secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    const p = payload as JWTPayload & { did?: string };
    if (typeof p.sub !== "string" || typeof p.did !== "string") return null;
    return { sub: p.sub, did: p.did };
  } catch {
    return null;
  }
}

/**
 * Refresh tokens are opaque random strings, not JWTs, and only their hash is
 * stored. A database leak therefore does not hand out working sessions.
 */
export function newRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTokenMatches(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashRefreshToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Space invite codes: short enough to read over WhatsApp, no ambiguous glyphs. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newInviteCode(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}
