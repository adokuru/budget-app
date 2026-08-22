import { Controller, Get, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DB, type Db } from "../db/db.module";

@Controller("health")
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Render pings this. It must actually touch Postgres — a health check that
   * only proves the process is alive will report green while every request fails.
   */
  @Get()
  async check() {
    const startedAt = Date.now();
    try {
      await this.db.execute(sql`select 1`);
      return { status: "ok", db: "up", latencyMs: Date.now() - startedAt };
    } catch (e) {
      return {
        status: "degraded",
        db: "down",
        latencyMs: Date.now() - startedAt,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
