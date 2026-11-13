DELETE FROM "cross_app_links" a USING "cross_app_links" b
WHERE a."workspace_id" = b."workspace_id"
  AND a."source_app" = b."source_app"
  AND a."source_ref" = b."source_ref"
  AND a."target_app" = b."target_app"
  AND a."target_ref" = b."target_ref"
  AND a."link_type" = b."link_type"
  AND (a."created_at", a."id") > (b."created_at", b."id");--> statement-breakpoint
CREATE UNIQUE INDEX "cross_app_links_unique_idx" ON "cross_app_links" USING btree ("workspace_id","source_app","source_ref","target_app","target_ref","link_type");--> statement-breakpoint
CREATE INDEX "cross_app_links_target_idx" ON "cross_app_links" USING btree ("workspace_id","target_app","target_ref");