import {
  Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, eq, isNull, gt } from "drizzle-orm";
import { DEFAULT_CATEGORIES } from "@budget/shared";
import { DB, type Db } from "../db/db.module";
import { spaces, memberships, invites, categories, users } from "../db/schema";
import { newInviteCode } from "../auth/tokens";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class SpacesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async listForUser(userId: string) {
    return this.db
      .select({
        id: spaces.id, name: spaces.name, baseCurrency: spaces.baseCurrency,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(spaces, eq(spaces.id, memberships.spaceId))
      .where(and(eq(memberships.userId, userId), isNull(memberships.revokedAt)));
  }

  async create(userId: string, name: string, baseCurrency: string) {
    const spaceId = randomUUID();
    await this.db.transaction(async (tx) => {
      await tx.insert(spaces).values({ id: spaceId, name, baseCurrency, createdBy: userId });
      await tx.insert(memberships).values({
        id: randomUUID(), userId, spaceId, role: "owner",
      });
      await tx.insert(categories).values(
        DEFAULT_CATEGORIES.map((c, i) => ({
          id: randomUUID(), spaceId, name: c.name, colorKey: c.colorKey,
          symbol: c.symbol, kind: c.kind, sort: i,
        }))
      );
    });
    return { id: spaceId, name, baseCurrency, role: "owner" as const };
  }

  async members(userId: string, spaceId: string) {
    await this.assertMember(userId, spaceId);
    return this.db
      .select({
        id: users.id, name: users.name, email: users.email,
        avatarUrl: users.avatarUrl, role: memberships.role, joinedAt: memberships.joinedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.spaceId, spaceId), isNull(memberships.revokedAt)));
  }

  /** A 6-character code, short enough to send over WhatsApp. */
  async createInvite(userId: string, spaceId: string) {
    await this.assertRole(userId, spaceId, ["owner", "member"]);
    const code = newInviteCode();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    await this.db.insert(invites).values({
      id: randomUUID(), spaceId, code, createdBy: userId, expiresAt,
    });
    return { code, expiresAt };
  }

  async join(userId: string, code: string) {
    const invite = await this.db.query.invites.findFirst({
      where: and(eq(invites.code, code), isNull(invites.acceptedBy), gt(invites.expiresAt, new Date())),
    });
    if (!invite) throw new NotFoundException("That invite code is invalid or has expired");

    const existing = await this.db.query.memberships.findFirst({
      where: and(eq(memberships.userId, userId), eq(memberships.spaceId, invite.spaceId)),
    });

    await this.db.transaction(async (tx) => {
      if (existing) {
        // Rejoining after removal reactivates rather than duplicating.
        await tx.update(memberships)
          .set({ revokedAt: null, deletedAt: null, updatedAt: new Date() })
          .where(eq(memberships.id, existing.id));
      } else {
        await tx.insert(memberships).values({
          id: randomUUID(), userId, spaceId: invite.spaceId, role: "member",
        });
      }
      await tx.update(invites)
        .set({ acceptedBy: userId, acceptedAt: new Date() })
        .where(eq(invites.id, invite.id));
    });

    const space = await this.db.query.spaces.findFirst({ where: eq(spaces.id, invite.spaceId) });
    return { id: space!.id, name: space!.name, baseCurrency: space!.baseCurrency, role: "member" };
  }

  /**
   * Removing a member sets revokedAt. Their next pull then receives every row
   * of the space as a deletion, which is the only way the protocol can tell a
   * device to forget data it already holds.
   */
  async removeMember(actorId: string, spaceId: string, targetUserId: string) {
    await this.assertRole(actorId, spaceId, ["owner"]);
    if (actorId === targetUserId) {
      throw new BadRequestException("Transfer ownership before leaving a space you own");
    }
    await this.db.update(memberships)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(memberships.spaceId, spaceId), eq(memberships.userId, targetUserId)));
  }

  private async assertMember(userId: string, spaceId: string) {
    const m = await this.db.query.memberships.findFirst({
      where: and(eq(memberships.userId, userId), eq(memberships.spaceId, spaceId),
                 isNull(memberships.revokedAt)),
    });
    if (!m) throw new ForbiddenException("You are not a member of that space");
    return m;
  }

  private async assertRole(userId: string, spaceId: string, roles: string[]) {
    const m = await this.assertMember(userId, spaceId);
    if (!roles.includes(m.role)) throw new ForbiddenException("You do not have permission for that");
    return m;
  }
}
