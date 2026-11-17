ALTER TABLE "tasks" ADD COLUMN "remind_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "reminded_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "tasks_pending_reminder_idx" ON "tasks" USING btree ("remind_at") WHERE "tasks"."reminded_at" is null and "tasks"."completed_at" is null and "tasks"."deleted_at" is null;