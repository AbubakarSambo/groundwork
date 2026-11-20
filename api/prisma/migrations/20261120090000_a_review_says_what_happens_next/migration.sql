-- 20 November 2026 (Batch S, S4). Add-only, nothing to backfill: a review decided before this reads as before, with no next
-- steps and no date to look at it again.
ALTER TABLE "performance_reviews" ADD COLUMN "next_steps" TEXT;
ALTER TABLE "performance_reviews" ADD COLUMN "look_again_on" DATE;
