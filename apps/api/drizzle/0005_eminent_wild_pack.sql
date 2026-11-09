ALTER TABLE "tasks" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "when_date" date;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "when_evening" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_someday" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "today_position" integer;--> statement-breakpoint
CREATE INDEX "tasks_workspace_when_date_idx" ON "tasks" USING btree ("workspace_id","when_date");--> statement-breakpoint
CREATE INDEX "tasks_workspace_is_someday_idx" ON "tasks" USING btree ("workspace_id","is_someday");--> statement-breakpoint
CREATE INDEX "tasks_workspace_completed_at_idx" ON "tasks" USING btree ("workspace_id","completed_at");--> statement-breakpoint
CREATE INDEX "tasks_workspace_today_position_idx" ON "tasks" USING btree ("workspace_id","today_position");--> statement-breakpoint
UPDATE "tasks" SET "completed_at" = "updated_at" WHERE "status" = 'done' AND "completed_at" IS NULL AND "deleted_at" IS NULL;