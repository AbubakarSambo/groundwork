-- A question the lead wants put to a person is asked word for word, and only once the lead has
-- confirmed the exact sentence. Decision 34, 28 September 2026. Both columns are nullable: every
-- line already stored has no confirmed question, so none of them is asked until the lead confirms it.
ALTER TABLE "ground_context_items" ADD COLUMN "exact_question" TEXT;
ALTER TABLE "ground_context_items" ADD COLUMN "question_confirmed_at" TIMESTAMP(3);
