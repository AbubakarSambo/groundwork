-- The customer's own work, held as a pointer.
--
-- Additive and org-scoped. Grounds are untouched; nothing in the live product reads this yet.
-- The unique key is the upsert key from the API contract: (org, source system, external id).

CREATE TYPE "SubjectType" AS ENUM ('OBJECTIVE', 'PROJECT', 'DECISION');

CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "type" "SubjectType" NOT NULL,
    "title" TEXT NOT NULL,
    "measure" TEXT,
    "target" TEXT,
    "owner_external_id" TEXT,
    "contributor_external_ids" JSONB,
    "parent_external_id" TEXT,
    "start_date" DATE,
    "due_date" DATE,
    "status" TEXT,
    "authored_by" TEXT NOT NULL DEFAULT 'imported',
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subjects_organization_id_source_system_external_id_key"
    ON "subjects"("organization_id", "source_system", "external_id");
CREATE INDEX "subjects_organization_id_type_idx" ON "subjects"("organization_id", "type");
CREATE INDEX "subjects_organization_id_synced_at_idx" ON "subjects"("organization_id", "synced_at");

ALTER TABLE "subjects" ADD CONSTRAINT "subjects_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
