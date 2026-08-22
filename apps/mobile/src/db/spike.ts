import { Database, Model } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { field, readonly, date } from "@nozbe/watermelondb/decorators";
import schema from "./spike-schema";

export class Spike extends Model {
  static table = "spikes";
  @field("label") label: string;
  @field("amount_minor") amountMinor: number;
  @readonly @date("created_at") createdAt: Date;
}

const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // the thing we are actually testing
  onSetUpError: (error) => {
    console.error("[spike] adapter setup failed", error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Spike],
});
