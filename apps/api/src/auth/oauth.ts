import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies Apple and Google identity tokens against their published keys.
 * The JWKS sets are cached and rotated by jose, so this is one network call
 * on cold start rather than one per sign-in.
 */
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type OAuthIdentity = {
  /** Stable provider user id. This, not the email, is the account key. */
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

export class OAuthVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthVerificationError";
  }
}

export async function verifyAppleToken(
  identityToken: string,
  audience: string
): Promise<OAuthIdentity> {
  try {
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience,
    });
    return {
      subject: String(payload.sub),
      // Apple sends the name only on the very first authorization, and the
      // email may be a @privaterelay.appleid.com alias. Both are expected.
      email: typeof payload.email === "string" ? payload.email : null,
      emailVerified: payload.email_verified === true || payload.email_verified === "true",
      name: null,
    };
  } catch (e) {
    throw new OAuthVerificationError(
      `Apple token rejected: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export async function verifyGoogleToken(
  idToken: string,
  audiences: string[]
): Promise<OAuthIdentity> {
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: audiences,
    });
    return {
      subject: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : null,
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch (e) {
    throw new OAuthVerificationError(
      `Google token rejected: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}
