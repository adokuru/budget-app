import {
  Inject, Injectable, UnauthorizedException, ConflictException, BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { DEFAULT_CATEGORIES } from "@budget/shared";
import { DB, type Db } from "../db/db.module";
import { users, devices, spaces, memberships, categories } from "../db/schema";
import { hashPassword, verifyPassword, assertPasswordShape, WeakPasswordError } from "./password";
import {
  signAccessToken, newRefreshToken, refreshTokenMatches, REFRESH_TTL_MS,
} from "./tokens";
import { verifyAppleToken, verifyGoogleToken, OAuthVerificationError } from "./oauth";
import type { LoginInput, OAuthInput, RefreshInput, RegisterInput } from "./dto";

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; avatarUrl: string | null };
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService
  ) {}

  private get secret(): string {
    return this.config.get<string>("JWT_SECRET") ?? "";
  }

  async register(input: RegisterInput): Promise<Session> {
    try {
      assertPasswordShape(input.password);
    } catch (e) {
      if (e instanceof WeakPasswordError) throw new BadRequestException(e.message);
      throw e;
    }

    const existing = await this.db.query.users.findFirst({
      where: eq(users.email, input.email),
    });
    if (existing) throw new ConflictException("An account with that email already exists");

    const userId = randomUUID();
    await this.db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
      });
      await seedPersonalSpace(tx, userId);
    });

    return this.issue(userId, input.deviceId, input.platform);
  }

  async login(input: LoginInput): Promise<Session> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    // Hash even when the user does not exist, so response time does not
    // reveal which emails have accounts.
    const stored = user?.passwordHash ?? "scrypt$131072$8$1$AAAA$AAAA";
    const ok = await verifyPassword(input.password, stored);
    if (!user || !ok) throw new UnauthorizedException("Email or password is incorrect");

    return this.issue(user.id, input.deviceId, input.platform);
  }

  async oauth(provider: "apple" | "google", input: OAuthInput): Promise<Session> {
    let identity;
    try {
      identity =
        provider === "apple"
          ? await verifyAppleToken(input.idToken, this.config.get("APPLE_BUNDLE_ID") ?? "")
          : await verifyGoogleToken(
              input.idToken,
              (this.config.get<string>("GOOGLE_CLIENT_IDS") ?? "").split(",").filter(Boolean)
            );
    } catch (e) {
      if (e instanceof OAuthVerificationError) {
        const name = provider === "apple" ? "Apple" : "Google";
        throw new UnauthorizedException(`${name} sign-in could not be verified. Try again.`);
      }
      throw e;
    }

    const column = provider === "apple" ? users.appleSub : users.googleSub;
    let user = await this.db.query.users.findFirst({ where: eq(column, identity.subject) });

    // Link to an existing account only when the provider vouched for the
    // email. Without that check, an unverified email is an account takeover.
    if (!user && identity.email && identity.emailVerified) {
      const byEmail = await this.db.query.users.findFirst({
        where: eq(users.email, identity.email),
      });
      if (byEmail) {
        await this.db
          .update(users)
          .set(provider === "apple" ? { appleSub: identity.subject } : { googleSub: identity.subject })
          .where(eq(users.id, byEmail.id));
        user = byEmail;
      }
    }

    if (!user) {
      const userId = randomUUID();
      // Apple sends the name once, on first authorization only; the client
      // forwards it because it can never be fetched again.
      const name = input.name ?? identity.name ?? "You";
      const email = identity.email ?? `${identity.subject}@${provider}.local`;

      await this.db.transaction(async (tx) => {
        await tx.insert(users).values({
          id: userId,
          email,
          name,
          ...(provider === "apple" ? { appleSub: identity.subject } : { googleSub: identity.subject }),
        });
        await seedPersonalSpace(tx, userId);
      });
      user = (await this.db.query.users.findFirst({ where: eq(users.id, userId) }))!;
    }

    return this.issue(user.id, input.deviceId, input.platform);
  }

  /** Refresh rotates the token, so a stolen one is usable at most once. */
  async refresh(input: RefreshInput): Promise<Session> {
    const device = await this.db.query.devices.findFirst({
      where: and(eq(devices.id, input.deviceId), isNull(devices.revokedAt)),
    });
    if (!device || !refreshTokenMatches(input.refreshToken, device.refreshTokenHash)) {
      throw new UnauthorizedException("Session expired, sign in again");
    }
    if (Date.now() - device.lastSeenAt.getTime() > REFRESH_TTL_MS) {
      throw new UnauthorizedException("Session expired, sign in again");
    }
    return this.issue(device.userId, device.id, device.platform);
  }

  async logout(deviceId: string): Promise<void> {
    await this.db.update(devices).set({ revokedAt: new Date() }).where(eq(devices.id, deviceId));
  }

  /**
   * Account deletion, required by App Store review for any app with sign-in.
   * Cascades through the user's data rather than leaving orphans.
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.update(devices).set({ revokedAt: new Date() }).where(eq(devices.userId, userId));
      await tx.update(memberships).set({ revokedAt: new Date(), deletedAt: new Date() })
        .where(eq(memberships.userId, userId));
      await tx.update(users)
        .set({ deletedAt: new Date(), email: `deleted-${userId}`, passwordHash: null,
               appleSub: null, googleSub: null, name: "Deleted account" })
        .where(eq(users.id, userId));
    });
  }

  private async issue(userId: string, deviceId: string, platform: string): Promise<Session> {
    const { token: refreshToken, hash } = newRefreshToken();

    await this.db
      .insert(devices)
      .values({ id: deviceId, userId, refreshTokenHash: hash, platform, lastSeenAt: new Date() })
      .onConflictDoUpdate({
        target: devices.id,
        set: { refreshTokenHash: hash, lastSeenAt: new Date(), revokedAt: null, userId },
      });

    const user = (await this.db.query.users.findFirst({ where: eq(users.id, userId) }))!;

    return {
      accessToken: await signAccessToken({ sub: userId, did: deviceId }, this.secret),
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    };
  }
}

/** Every new account gets a private Personal space with the Nigerian defaults. */
async function seedPersonalSpace(tx: Db, userId: string): Promise<void> {
  const spaceId = randomUUID();
  await tx.insert(spaces).values({
    id: spaceId, name: "Personal", baseCurrency: "NGN", createdBy: userId,
  });
  await tx.insert(memberships).values({
    id: randomUUID(), userId, spaceId, role: "owner",
  });
  await tx.insert(categories).values(
    DEFAULT_CATEGORIES.map((c, i) => ({
      id: randomUUID(),
      spaceId,
      name: c.name,
      colorKey: c.colorKey,
      symbol: c.symbol,
      emoji: c.emoji,
      kind: c.kind,
      sort: i,
    }))
  );
}
