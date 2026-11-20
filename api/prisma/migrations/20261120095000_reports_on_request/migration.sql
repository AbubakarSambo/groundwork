-- 20 November 2026 (Batch S, S8). Add-only, nothing to backfill: a report asked for in the chat, and what the person added for it.
CREATE TABLE "reports_on_request" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "asked" TEXT NOT NULL,
    "outline" JSONB,
    "sources" JSONB,
    "report" TEXT,
    "prompt_version_id" TEXT,
    "built_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reports_on_request_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reports_on_request_organization_id_user_id_status_idx" ON "reports_on_request"("organization_id", "user_id", "status");

CREATE TABLE "report_materials" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "via" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_materials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "report_materials_request_id_content_hash_key" ON "report_materials"("request_id", "content_hash");
CREATE INDEX "report_materials_request_id_idx" ON "report_materials"("request_id");
