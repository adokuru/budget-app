import { Body, Controller, Get, Post, Query, UseGuards, HttpCode } from "@nestjs/common";
import { z } from "zod";
import { SyncService, type Changes } from "./sync.service";
import { Auth, JwtGuard } from "../auth/jwt.guard";
import { ZodBody } from "../auth/zod.pipe";
import type { AccessClaims } from "../auth/tokens";
import { SYNC_SCHEMA, type SyncTableName } from "@budget/shared";

const pushSchema = z.object({
  changes: z.record(z.string(), z.object({
    created: z.array(z.record(z.string(), z.unknown())).default([]),
    updated: z.array(z.record(z.string(), z.unknown())).default([]),
    deleted: z.array(z.string()).default([]),
  })),
  lastPulledAt: z.coerce.number().int().nonnegative().default(0),
});

@Controller("sync")
@UseGuards(JwtGuard)
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Get("pull")
  pull(
    @Auth() claims: AccessClaims,
    @Query("lastPulledAt") lastPulledAt?: string,
    @Query("schemaVersion") schemaVersion?: string,
    @Query("migrationTables") migrationTables?: string
  ) {
    const version = Math.max(1, Number(schemaVersion ?? 1) || 1);
    const migrations = (migrationTables ?? "")
      .split(",")
      .filter((name): name is SyncTableName => name in SYNC_SCHEMA);
    return this.sync.pull(claims.sub, Number(lastPulledAt ?? 0) || 0, version, migrations);
  }

  @Post("push")
  @HttpCode(204)
  async push(
    @Auth() claims: AccessClaims,
    @Body(new ZodBody(pushSchema)) body: { changes: Changes; lastPulledAt: number }
  ) {
    await this.sync.push(claims.sub, body.changes, body.lastPulledAt);
  }
}
