-- RELEASE 6: DIRECTION (Hafsah, 24 October 2026). Add-only; can be run again. Off for every organisation.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_6_direction_on" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS "direction_versions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "set_by_user_id" TEXT,
  "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "now" JSONB NOT NULL,
  "what_changed" JSONB NOT NULL,
  "teams" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direction_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "direction_versions_organization_id_version_key" ON "direction_versions"("organization_id", "version");
CREATE TABLE IF NOT EXISTS "goal_versions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "ground_id" TEXT NOT NULL,
  "objective_id" TEXT,
  "owner_participant_id" TEXT,
  "direction_version" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "target" DOUBLE PRECISION,
  "count" DOUBLE PRECISION,
  "unit" TEXT,
  "outcome" TEXT NOT NULL,
  "new_name" TEXT,
  "new_target" DOUBLE PRECISION,
  "decided_by" TEXT NOT NULL,
  "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "goal_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "goal_versions_organization_id_direction_version_idx" ON "goal_versions"("organization_id", "direction_version");
CREATE INDEX IF NOT EXISTS "goal_versions_ground_id_idx" ON "goal_versions"("ground_id");
