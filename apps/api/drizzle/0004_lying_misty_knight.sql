CREATE TABLE "calendar_event_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"original_occurrence_start" timestamp with time zone NOT NULL,
	"cancelled" boolean DEFAULT false NOT NULL,
	"title" text,
	"description" text,
	"location" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"start_date" date,
	"end_date" date,
	"is_all_day" boolean,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"start_date" date,
	"end_date" date,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"rrule" text,
	"kind" text DEFAULT 'event' NOT NULL,
	"color" text,
	"created_by_user_id" uuid NOT NULL,
	"source" text DEFAULT 'local' NOT NULL,
	"external_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_feed_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "calendar_feed_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "calendar_event_exceptions" ADD CONSTRAINT "calendar_event_exceptions_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_exceptions" ADD CONSTRAINT "calendar_event_exceptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_feed_tokens" ADD CONSTRAINT "calendar_feed_tokens_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_feed_tokens" ADD CONSTRAINT "calendar_feed_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_event_exceptions_event_occurrence_idx" ON "calendar_event_exceptions" USING btree ("event_id","original_occurrence_start");--> statement-breakpoint
CREATE INDEX "calendar_event_exceptions_workspace_idx" ON "calendar_event_exceptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "calendar_events_workspace_start_at_idx" ON "calendar_events" USING btree ("workspace_id","start_at");--> statement-breakpoint
CREATE INDEX "calendar_events_workspace_end_at_idx" ON "calendar_events" USING btree ("workspace_id","end_at");--> statement-breakpoint
CREATE INDEX "calendar_events_workspace_start_date_idx" ON "calendar_events" USING btree ("workspace_id","start_date");--> statement-breakpoint
CREATE INDEX "calendar_events_workspace_deleted_at_idx" ON "calendar_events" USING btree ("workspace_id","deleted_at");--> statement-breakpoint
CREATE INDEX "calendar_feed_tokens_workspace_user_idx" ON "calendar_feed_tokens" USING btree ("workspace_id","user_id");