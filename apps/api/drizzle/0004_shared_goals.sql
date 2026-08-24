CREATE TABLE "goal_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"goal_id" text NOT NULL,
	"created_by" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"contributed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "goal_contributions_amount_positive" CHECK ("goal_contributions"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"space_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"target_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "goals_target_positive" CHECK ("goals"."target_minor" > 0),
	CONSTRAINT "goals_name_not_blank" CHECK (length(trim("goals"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goal_contributions_goal_date_idx" ON "goal_contributions" USING btree ("goal_id","contributed_at");--> statement-breakpoint
CREATE INDEX "goal_contributions_space_idx" ON "goal_contributions" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "goals_space_due_idx" ON "goals" USING btree ("space_id","due_at");