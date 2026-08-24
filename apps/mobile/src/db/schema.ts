import { appSchema, tableSchema, type ColumnSchema } from "@nozbe/watermelondb";
import type { TableSchemaSpec } from "@nozbe/watermelondb/Schema";
import { SYNC_SCHEMA, SYNC_SCHEMA_VERSION, SYNC_TABLE_NAMES, type SyncTableName } from "@budget/shared";

/**
 * Generated from the shared manifest rather than hand-written, so the client
 * schema cannot drift from it. The Postgres side is hand-written (it needs
 * real types, FKs and indexes) and guarded by apps/api/test/schema-parity.
 */
export const SCHEMA_VERSION = SYNC_SCHEMA_VERSION;

export function tableSpec(name: SyncTableName): TableSchemaSpec {
  return {
    name,
    columns: Object.entries(SYNC_SCHEMA[name]).map(
      ([columnName, def]): ColumnSchema => ({
        name: columnName,
        type: def.type,
        ...(def.optional ? { isOptional: true } : {}),
        ...(def.indexed ? { isIndexed: true } : {}),
      })
    ),
  };
}

export default appSchema({
  version: SCHEMA_VERSION,
  tables: SYNC_TABLE_NAMES.map((name) => tableSchema(tableSpec(name))),
});
