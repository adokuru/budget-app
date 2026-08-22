import { Global, Module, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const DB = Symbol("DB");
export const PG_POOL = Symbol("PG_POOL");

export type Db = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("DATABASE_URL");
        if (!url) throw new Error("DATABASE_URL is not set");
        return new Pool({
          connectionString: url,
          // Render Postgres requires TLS; local DBngin does not offer it.
          ssl: url.includes("localhost") || url.includes("127.0.0.1")
            ? false
            : { rejectUnauthorized: false },
        });
      },
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [DB, PG_POOL],
})
export class DbModule implements OnApplicationShutdown {
  constructor() {}
  async onApplicationShutdown() {}
}
