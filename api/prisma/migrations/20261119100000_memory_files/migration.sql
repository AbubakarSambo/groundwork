-- 19 November 2026. Add-only.
-- Memory files (memory system, step 2): one versioned book per organisation, team, person and project, every statement citing its evidence.
CREATE TABLE "memory_files" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "path" VARCHAR(120) NOT NULL,
    "kind" VARCHAR(8) NOT NULL,
    "version" INTEGER NOT NULL,
    "header" JSONB NOT NULL,
    "sections" JSONB NOT NULL,
    "built_from" TEXT NOT NULL,
    "based_on_version" INTEGER,
    "made_by" VARCHAR(40) NOT NULL DEFAULT 'the memory writer',
    "why" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memory_files_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "memory_files_organization_id_path_version_key" ON "memory_files"("organization_id", "path", "version");
CREATE INDEX "memory_files_organization_id_kind_idx" ON "memory_files"("organization_id", "kind");
ALTER TABLE "memory_files" ADD CONSTRAINT "memory_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
