-- RELEASE 9: POLICY AND SETTING UP FROM DOCUMENTS (Hafsah, 24 October 2026). Add-only; can be run again. Off for every organisation.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_9_policy_on" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "policy_documents" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "added_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "policy_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "policy_documents_organization_id_idx" ON "policy_documents"("organization_id");

CREATE TABLE IF NOT EXISTS "policy_rules" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "document_id" TEXT,
  "area" TEXT NOT NULL,
  "says" TEXT NOT NULL,
  "document" TEXT NOT NULL,
  "where" TEXT,
  "exceptions_by" TEXT,
  "applies_to" TEXT,
  "measure" TEXT,
  "value" TEXT,
  "state" TEXT NOT NULL DEFAULT 'proposed',
  "changed_on" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "policy_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "policy_rules_organization_id_area_idx" ON "policy_rules"("organization_id", "area");
