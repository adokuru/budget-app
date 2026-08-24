import { createTable, schemaMigrations } from "@nozbe/watermelondb/Schema/migrations";
import { tableSpec } from "./schema";

export const migrations = schemaMigrations({
  migrations: [{
    toVersion: 2,
    steps: [createTable(tableSpec("goals")), createTable(tableSpec("goal_contributions"))],
  }],
});
