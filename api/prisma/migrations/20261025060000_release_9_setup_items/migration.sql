-- RELEASE 9: what was read from an admin's documents to set up from (people, teams, clients, goals, roles). Add-only; can be run again.
CREATE TABLE IF NOT EXISTS "setup_items" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "document_id" TEXT,
  "area" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "document" TEXT NOT NULL,
  "where" TEXT,
  "state" TEXT NOT NULL DEFAULT 'proposed',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "setup_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "setup_items_organization_id_area_idx" ON "setup_items"("organization_id", "area");
