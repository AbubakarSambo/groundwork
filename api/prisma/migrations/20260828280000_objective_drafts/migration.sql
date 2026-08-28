-- An objective being written, before it is one.
--
-- Most objectives are written in a planning session with no memory of what happened last cycle.
-- This has that memory: grounded_on_finding_ids holds the findings it was built from, so "why is
-- the target fourteen days" has an answer six months later instead of a shrug.
--
-- Contention is the OUTPUT, not an error state. If the initiator proposes fourteen days and a
-- contributor says that was never achievable, the draft carries the disagreement - it does not
-- average them, and it does not let the initiator's version stand because they typed first.

CREATE TYPE "DraftState" AS ENUM ('DRAFTING', 'GATHERING', 'CONTESTED', 'READY', 'SEEDED', 'ABANDONED');
CREATE TYPE "DraftParticipantState" AS ENUM ('INVITED', 'RESPONDED', 'DECLINED');

CREATE TABLE "objective_drafts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "initiator_external_id" TEXT NOT NULL,
    "parent_subject_external_id" TEXT,
    "working_title" TEXT NOT NULL,
    "proposed_measure" TEXT,
    "proposed_target" TEXT,
    "proposed_owner_external_id" TEXT,
    "proposed_due_date" TIMESTAMP(3),
    "grounded_on_finding_ids" TEXT[],
    "state" "DraftState" NOT NULL DEFAULT 'DRAFTING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "seeded_subject_external_id" TEXT,

    CONSTRAINT "objective_drafts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "objective_drafts_organization_id_state_idx" ON "objective_drafts"("organization_id", "state");
ALTER TABLE "objective_drafts" ADD CONSTRAINT "objective_drafts_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "draft_participants" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "invited_by_external_id" TEXT NOT NULL,
    "state" "DraftParticipantState" NOT NULL DEFAULT 'INVITED',
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "draft_participants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "draft_participants_draft_id_person_external_id_key" ON "draft_participants"("draft_id", "person_external_id");
ALTER TABLE "draft_participants" ADD CONSTRAINT "draft_participants_draft_id_fkey"
    FOREIGN KEY ("draft_id") REFERENCES "objective_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "draft_contributions" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_contributions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "draft_contributions_draft_id_field_idx" ON "draft_contributions"("draft_id", "field");
ALTER TABLE "draft_contributions" ADD CONSTRAINT "draft_contributions_draft_id_fkey"
    FOREIGN KEY ("draft_id") REFERENCES "objective_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "draft_contentions" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "positions" JSONB NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,

    CONSTRAINT "draft_contentions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "draft_contentions_draft_id_resolved_at_idx" ON "draft_contentions"("draft_id", "resolved_at");
ALTER TABLE "draft_contentions" ADD CONSTRAINT "draft_contentions_draft_id_fkey"
    FOREIGN KEY ("draft_id") REFERENCES "objective_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
