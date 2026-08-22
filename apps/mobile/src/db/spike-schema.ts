import { appSchema, tableSchema } from "@nozbe/watermelondb";

// ponytail: throwaway schema for the SDK 57 / New Arch spike only.
// Real schema lands in Phase 1 once the native layer is proven.
export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "spikes",
      columns: [
        { name: "label", type: "string" },
        { name: "amount_minor", type: "number" },
        { name: "created_at", type: "number" },
      ],
    }),
  ],
});
