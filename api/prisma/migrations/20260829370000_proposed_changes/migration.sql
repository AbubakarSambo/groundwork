-- SIX IS STILL THE TARGET WHILE FOUR IS BEING ASKED FOR.
--
-- Without this the two cannot coexist: somebody says in a check-in that six should be four, it sits
-- in a transcript, and a later summary may treat four as the number. That is a proposal becoming an
-- agreement because nobody modelled the difference.
CREATE TYPE "ProposedChangeState" AS ENUM ('AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'CANCELLED');

CREATE TABLE "proposed_changes" (
  "id"                      TEXT NOT NULL,
  "organization_id"         TEXT NOT NULL,
  "person_objective_id"     TEXT NOT NULL,
  "proposed_text"           TEXT NOT NULL,
  "reason"                  TEXT,
  "proposed_by_external_id" TEXT NOT NULL,
  "approver_external_id"    TEXT NOT NULL,
  "state"                   "ProposedChangeState" NOT NULL DEFAULT 'AWAITING_APPROVAL',
  "decided_by_external_id"  TEXT,
  "decided_in"              TEXT,
  "decided_at"              TIMESTAMP(3),
  "decision_note"           TEXT,
  "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMP(3) NOT NULL,
  CONSTRAINT "proposed_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proposed_changes_organization_id_state_idx" ON "proposed_changes" ("organization_id", "state");
CREATE INDEX "proposed_changes_person_objective_id_state_idx" ON "proposed_changes" ("person_objective_id", "state");

ALTER TABLE "proposed_changes" ADD CONSTRAINT "proposed_changes_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- CASCADE: a proposal about an objective that no longer exists is not a decision anybody can make.
ALTER TABLE "proposed_changes" ADD CONSTRAINT "proposed_changes_person_objective_id_fkey"
  FOREIGN KEY ("person_objective_id") REFERENCES "person_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
