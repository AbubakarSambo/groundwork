CREATE TYPE "GateState" AS ENUM ('PENDING', 'DONE', 'WAIVED');

CREATE TABLE "onboarding_tracks" (
  "id"              TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "role_name"       TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "onboarding_tracks_pkey" PRIMARY KEY ("id")
);
-- One track per role. Two would mean somebody joining had two answers about what they owe.
CREATE UNIQUE INDEX "onboarding_tracks_org_role_key" ON "onboarding_tracks" ("organization_id", "role_name");

CREATE TABLE "onboarding_gates" (
  "id"          TEXT NOT NULL,
  "track_id"    TEXT NOT NULL,
  "key"         TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "ordinal"     INTEGER NOT NULL,
  "required"    BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "onboarding_gates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "onboarding_gates_track_key" ON "onboarding_gates" ("track_id", "key");
CREATE INDEX "onboarding_gates_track_ordinal_idx" ON "onboarding_gates" ("track_id", "ordinal");

CREATE TABLE "onboarding_statuses" (
  "id"                 TEXT NOT NULL,
  "organization_id"    TEXT NOT NULL,
  "person_external_id" TEXT NOT NULL,
  "gate_id"            TEXT NOT NULL,
  "state"              "GateState" NOT NULL DEFAULT 'PENDING',
  "completed_at"       TIMESTAMP(3),
  "evidence_ref"       TEXT,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "onboarding_statuses_pkey" PRIMARY KEY ("id")
);
-- One row per person per gate. The unique index is the idempotency guard for marking one done.
CREATE UNIQUE INDEX "onboarding_statuses_person_gate_key" ON "onboarding_statuses" ("person_external_id", "gate_id");
CREATE INDEX "onboarding_statuses_org_person_idx" ON "onboarding_statuses" ("organization_id", "person_external_id");

ALTER TABLE "onboarding_tracks" ADD CONSTRAINT "onboarding_tracks_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_gates" ADD CONSTRAINT "onboarding_gates_track_id_fkey"
  FOREIGN KEY ("track_id") REFERENCES "onboarding_tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_statuses" ADD CONSTRAINT "onboarding_statuses_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_statuses" ADD CONSTRAINT "onboarding_statuses_gate_id_fkey"
  FOREIGN KEY ("gate_id") REFERENCES "onboarding_gates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
