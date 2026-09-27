-- PERFORMANCE REVIEWS (U.17, E4). A new table, empty until a manager starts a review for one that
-- falls due (evaluations_due, which the daily reminder already reads). It holds the manager's own
-- words, the person's own view, the decision with its reasons, and, once the engine writes it, what
-- Groundwork noticed. No score, no verdict. Nothing existing is altered.
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "evaluation_due_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "started_by_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "managers_words" TEXT,
    "managers_words_by_id" TEXT,
    "managers_words_at" TIMESTAMP(3),
    "their_view" TEXT,
    "their_view_at" TIMESTAMP(3),
    "noticed" JSONB,
    "noticed_prompt_version_id" TEXT,
    "decision" TEXT,
    "decision_reasons" TEXT,
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "performance_reviews_evaluation_due_id_key" ON "performance_reviews"("evaluation_due_id");

CREATE INDEX "performance_reviews_organization_id_person_external_id_idx" ON "performance_reviews"("organization_id", "person_external_id");

ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
