-- Every period a behaviour was actually observed in, not only the consecutive run.
--
-- Measured on a live three-month engagement: a consultant who made an uncompleted future-tense
-- promise in all six fortnights had E2 (Intro Evasion) detected in fortnight two and fortnight six,
-- and the lead was told nothing, because periodsObserved is a consecutive streak and a gap reset it
-- to one. Three periods is still the floor. It is now counted honestly, gaps and all, and the row
-- says which periods they were so a lead can see "three of six, not consecutive" for themselves.
ALTER TABLE "pattern_detections" ADD COLUMN IF NOT EXISTS "seen_in_sessions" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
-- Backfill what can be known: the period each existing row was last seen in.
UPDATE "pattern_detections"
   SET "seen_in_sessions" = ARRAY["last_period_number"]
 WHERE "last_period_number" IS NOT NULL AND cardinality("seen_in_sessions") = 0;
