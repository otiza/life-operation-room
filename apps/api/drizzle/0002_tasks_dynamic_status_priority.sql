ALTER TABLE "tasks" ALTER COLUMN "status" SET DATA TYPE text USING "status"::text;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'todo';--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "priority" SET DATA TYPE text USING "priority"::text;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "priority" SET DEFAULT 'none';--> statement-breakpoint
DROP TYPE "public"."task_status";--> statement-breakpoint
DROP TYPE "public"."task_priority";
