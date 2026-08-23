import { Model, type Query, type Relation } from "@nozbe/watermelondb";
import { field, text, date, readonly, children, relation } from "@nozbe/watermelondb/decorators";
import type { Currency, ColorKey, CategoryKind } from "@budget/shared";

/**
 * Model fields deliberately omit TypeScript's `!` definite-assignment marker.
 * Babel rejects it on decorated fields, and the decorator installs a prototype
 * accessor anyway, so a plain declaration is both required and correct here.
 */

export class User extends Model {
  static table = "users";
  @text("name") name: string;
  @text("email") email: string;
  @text("avatar_url") avatarUrl: string | null;
}

export class Space extends Model {
  static table = "spaces";
  static associations = {
    categories: { type: "has_many", foreignKey: "space_id" },
    transactions: { type: "has_many", foreignKey: "space_id" },
  } as const;

  @text("name") name: string;
  @text("base_currency") baseCurrency: Currency;
  @field("created_by") createdBy: string;
  @readonly @date("created_at") createdAt: Date;
  @readonly @date("updated_at") updatedAt: Date;

  @children("categories") categories: Query<Category>;
  @children("transactions") transactions: Query<Transaction>;
}

export class Membership extends Model {
  static table = "memberships";
  @field("user_id") userId: string;
  @field("space_id") spaceId: string;
  @text("role") role: "owner" | "member" | "viewer";
  @date("joined_at") joinedAt: Date;
}

export class Category extends Model {
  static table = "categories";
  static associations = {
    transactions: { type: "has_many", foreignKey: "category_id" },
  } as const;

  @field("space_id") spaceId: string;
  @text("name") name: string;
  @text("color_key") colorKey: ColorKey;
  @text("symbol") symbol: string;
  @text("emoji") emoji: string;
  @text("kind") kind: CategoryKind;
  @field("sort") sort: number;
  @field("archived") archived: boolean;
  @readonly @date("created_at") createdAt: Date;
  @readonly @date("updated_at") updatedAt: Date;
}

export class Transaction extends Model {
  static table = "transactions";
  static associations = {
    categories: { type: "belongs_to", key: "category_id" },
  } as const;

  @field("space_id") spaceId: string;
  @field("category_id") categoryId: string;
  @field("created_by") createdBy: string;
  @text("kind") kind: CategoryKind;
  /** Integer minor units, always. */
  @field("amount_minor") amountMinor: number;
  @text("currency") currency: Currency;
  /** Frozen at entry time so history never re-prices. */
  @field("rate_to_base") rateToBase: number;
  @field("base_minor") baseMinor: number;
  @text("note") note: string | null;
  @date("occurred_at") occurredAt: Date;
  @field("recurring_rule_id") recurringRuleId: string | null;
  @readonly @date("created_at") createdAt: Date;
  @readonly @date("updated_at") updatedAt: Date;

  @relation("categories", "category_id") category: Relation<Category>;
}

export class RecurringRule extends Model {
  static table = "recurring_rules";
  @field("space_id") spaceId: string;
  @field("category_id") categoryId: string;
  @text("kind") kind: CategoryKind;
  @text("label") label: string;
  @field("amount_minor") amountMinor: number;
  @text("currency") currency: Currency;
  @text("freq") freq: "monthly" | "weekly" | "biweekly" | "yearly";
  @field("day_of_month") dayOfMonth: number | null;
  @field("weekday") weekday: number | null;
  @field("interval") interval: number;
  @date("start_on") startOn: Date;
  @date("end_on") endOn: Date | null;
  /** false means it asks you to confirm — the salary case. */
  @field("auto_post") autoPost: boolean;
  @date("next_run_at") nextRunAt: Date;
  @date("last_run_at") lastRunAt: Date | null;
  @field("active") active: boolean;
  @readonly @date("created_at") createdAt: Date;
  @readonly @date("updated_at") updatedAt: Date;
}

export class Budget extends Model {
  static table = "budgets";
  @field("space_id") spaceId: string;
  @field("category_id") categoryId: string;
  @date("period_start") periodStart: Date;
  @field("amount_minor") amountMinor: number;
  @text("currency") currency: Currency;
  @readonly @date("created_at") createdAt: Date;
  @readonly @date("updated_at") updatedAt: Date;
}

export const MODELS = [
  User, Space, Membership, Category, Transaction, RecurringRule, Budget,
];
