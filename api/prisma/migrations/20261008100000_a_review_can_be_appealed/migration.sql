-- A decided review can be appealed (decision 113): new columns on performance_reviews, all empty, and nothing else. No existing row is changed.
ALTER TABLE "performance_reviews" ADD COLUMN IF NOT EXISTS "appeal" TEXT;
ALTER TABLE "performance_reviews" ADD COLUMN IF NOT EXISTS "appeal_additions" JSONB;
ALTER TABLE "performance_reviews" ADD COLUMN IF NOT EXISTS "appealed_at" TIMESTAMP(3);
ALTER TABLE "performance_reviews" ADD COLUMN IF NOT EXISTS "appeal_asked_for_admin_at" TIMESTAMP(3);
ALTER TABLE "performance_reviews" ADD COLUMN IF NOT EXISTS "appeal_outcome" TEXT;
ALTER TABLE "performance_reviews" ADD COLUMN IF NOT EXISTS "appeal_reasons" TEXT;
ALTER TABLE "performance_reviews" ADD COLUMN IF NOT EXISTS "appeal_decided_by_id" TEXT;
ALTER TABLE "performance_reviews" ADD COLUMN IF NOT EXISTS "appeal_decided_at" TIMESTAMP(3);
ALTER TABLE "performance_reviews" ADD COLUMN IF NOT EXISTS "appeal_decision_was" JSONB;
