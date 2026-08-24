import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import schema, { SCHEMA_VERSION } from "./schema";
import { migrations } from "./migrations";
import { MODELS } from "./models";

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  dbName: "kobo",
  onSetUpError: (error) => {
    console.error("[db] setup failed", error);
  },
});

export const database = new Database({ adapter, modelClasses: MODELS });

export { SCHEMA_VERSION };
export * from "./models";
