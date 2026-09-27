-- WHEN SOMEONE LEAVES (U.17, E5). Three new tables, empty until used: a leaving list for one person's
-- last day, its four steps with an owner and done or not, and signs that a team is under strain,
-- which the engine writes for a team, never a named person. The handover and departures are not
-- altered. Nothing existing is altered.
CREATE TABLE "leaving_checklists" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "last_day" DATE NOT NULL,
    "started_by_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaving_checklists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leaving_steps" (
    "id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "step" VARCHAR(16) NOT NULL,
    "owner_user_id" TEXT,
    "done_at" TIMESTAMP(3),
    "done_by_id" TEXT,

    CONSTRAINT "leaving_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_strain_signs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "team" VARCHAR(120) NOT NULL,
    "says" TEXT NOT NULL,
    "prompt_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_strain_signs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leaving_checklists_organization_id_person_external_id_last_day_key" ON "leaving_checklists"("organization_id", "person_external_id", "last_day");

CREATE UNIQUE INDEX "leaving_steps_checklist_id_step_key" ON "leaving_steps"("checklist_id", "step");

CREATE INDEX "team_strain_signs_organization_id_created_at_idx" ON "team_strain_signs"("organization_id", "created_at");

ALTER TABLE "leaving_checklists" ADD CONSTRAINT "leaving_checklists_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leaving_steps" ADD CONSTRAINT "leaving_steps_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "leaving_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_strain_signs" ADD CONSTRAINT "team_strain_signs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
