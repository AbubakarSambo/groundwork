-- The strategy keeps its versions: a new table, and nothing else. No existing row is changed.
CREATE TABLE IF NOT EXISTS "strategy_versions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL,
  "priorities" JSONB NOT NULL,
  "priorities_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "strategy_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "strategy_versions_organization_id_number_key" ON "strategy_versions"("organization_id", "number");
