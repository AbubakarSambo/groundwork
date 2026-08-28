-- Something somebody said they would do, held across grounds.
--
-- PersonObjective with kind COMMITMENT already holds this inside a ground and is untouched. This
-- accumulates alongside it so a person's word carries from one check-in to the next.
--
-- A date and the words are different things. due_said is what they actually said and is always
-- kept; due_at is set only where somebody gave a date. Everything time-based runs on due_at alone,
-- so a commitment with words and no date is never reported as late - because we do not know.

CREATE TYPE "CommitmentState" AS ENUM ('OPEN', 'KEPT', 'SLIPPED', 'DROPPED');

CREATE TABLE "commitments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "subject_external_id" TEXT,
    "text" TEXT NOT NULL,
    "due_said" TEXT,
    "due_at" TIMESTAMP(3),
    "state" "CommitmentState" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL DEFAULT 'check_in',
    "source_ground_id" TEXT,
    "source_person_objective_id" TEXT,
    "stated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "last_followed_up_at" TIMESTAMP(3),

    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commitments_source_person_objective_id_key" ON "commitments"("source_person_objective_id");
CREATE INDEX "commitments_organization_id_person_external_id_state_idx" ON "commitments"("organization_id", "person_external_id", "state");
CREATE INDEX "commitments_organization_id_state_due_at_idx" ON "commitments"("organization_id", "state", "due_at");

ALTER TABLE "commitments" ADD CONSTRAINT "commitments_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The once-a-day rule is a question about the calendar, not about elapsed hours, so this is a date.
ALTER TABLE "people" ADD COLUMN "last_nudged_on" DATE;
