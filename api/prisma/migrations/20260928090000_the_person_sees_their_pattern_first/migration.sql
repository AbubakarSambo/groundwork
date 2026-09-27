-- THE PERSON SEES THEIR PATTERN FIRST, AND CAN ANSWER IT (Hafsah, 27 September 2026).
-- When a pattern had been seen in three periods, when the person it is about was first shown it,
-- and what they said is behind it. The lead reads it only after the person has had their turn.
ALTER TABLE "pattern_detections" ADD COLUMN "ready_at" TIMESTAMP(3);
ALTER TABLE "pattern_detections" ADD COLUMN "shown_to_person_at" TIMESTAMP(3);
ALTER TABLE "pattern_detections" ADD COLUMN "person_answer" TEXT;
ALTER TABLE "pattern_detections" ADD COLUMN "person_answered_at" TIMESTAMP(3);

-- Rows already seen in three periods were ready when they were last seen; nobody has been shown one.
UPDATE "pattern_detections"
SET "ready_at" = "last_seen_at"
WHERE cardinality("seen_in_sessions") >= 3 OR "periods_observed" >= 3;
