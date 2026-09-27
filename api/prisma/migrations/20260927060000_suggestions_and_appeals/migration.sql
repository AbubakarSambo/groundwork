-- SUGGESTIONS FROM A VERDICT, AND APPEALS (U.13, C3; decisions rule 6). A new table, empty until the
-- engine writes a suggestion. The lead reads the suggestion and decides with a reason; the person
-- reads the facts and the decision, and can add their side or appeal; an admin decides an appeal.
-- `verdict` is kept for the engine and served to nobody. Nothing existing is altered.
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "about_participant_id" TEXT NOT NULL,
    "verdict" VARCHAR(16) NOT NULL,
    "headline" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "what_would_change_it" TEXT,
    "their_own_answer" TEXT,
    "if_you_agree" TEXT,
    "other_choices" TEXT[],
    "for_the_ending" VARCHAR(40),
    "facts_for_them" TEXT NOT NULL,
    "what_would_change_it_for_them" TEXT,
    "prompt_version_id" TEXT,
    "decision" TEXT,
    "decision_reason" TEXT,
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "their_side" TEXT,
    "their_side_at" TIMESTAMP(3),
    "appeal" TEXT,
    "appealed_at" TIMESTAMP(3),
    "appeal_outcome" VARCHAR(16),
    "appeal_reason" TEXT,
    "appeal_decided_by_id" TEXT,
    "appeal_decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "suggestions_ground_id_idx" ON "suggestions"("ground_id");
CREATE INDEX "suggestions_about_participant_id_idx" ON "suggestions"("about_participant_id");
CREATE INDEX "suggestions_organization_id_appealed_at_idx" ON "suggestions"("organization_id", "appealed_at");

ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_about_participant_id_fkey" FOREIGN KEY ("about_participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
