import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const local = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: local ? false : { rejectUnauthorized: false },
});

async function run() {
  try {
    await migrate(drizzle(pool), { migrationsFolder: resolve(process.cwd(), "drizzle") });
    console.log("database migrations complete");
  } finally {
    await pool.end();
  }
}

void run().catch((error: unknown) => {
  console.error("database migration failed", error);
  process.exitCode = 1;
});
