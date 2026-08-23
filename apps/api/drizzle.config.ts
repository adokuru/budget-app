import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";

if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");

const databaseUrl = new URL(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/kobo_dev");
if (databaseUrl.hostname.endsWith(".render.com")) databaseUrl.searchParams.set("sslmode", "verify-full");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl.href,
  },
});
