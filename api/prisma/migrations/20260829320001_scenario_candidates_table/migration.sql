-- Split from the enum migration because Postgres will not use a new enum value in the same
-- transaction that added it.
CREATE TABLE "scenario_candidates" (
  "id"                             TEXT NOT NULL,
  "organization_id"                TEXT NOT NULL,
  "scenario"                       "GroundScenario" NOT NULL,
  "subject_external_id"            TEXT,
  "person_external_id"             TEXT,
  "evidence"                       JSONB NOT NULL,
  "confidence"                     DOUBLE PRECISION NOT NULL,
  "proposed_to_person_external_id" TEXT NOT NULL,
  "proposed_at"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "state"                          "ScenarioCandidateState" NOT NULL DEFAULT 'PROPOSED',
  "resolved_at"                    TIMESTAMP(3),
  "expires_at"                     TIMESTAMP(3) NOT NULL,
  "ground_id"                      TEXT,
  "created_at"                     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scenario_candidates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scenario_candidates_org_state_expiry_idx" ON "scenario_candidates" ("organization_id", "state", "expires_at");
CREATE INDEX "scenario_candidates_org_scenario_subject_idx" ON "scenario_candidates" ("organization_id", "scenario", "subject_external_id");
CREATE INDEX "scenario_candidates_org_proposed_to_idx" ON "scenario_candidates" ("organization_id", "proposed_to_person_external_id", "state");

ALTER TABLE "scenario_candidates" ADD CONSTRAINT "scenario_candidates_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
