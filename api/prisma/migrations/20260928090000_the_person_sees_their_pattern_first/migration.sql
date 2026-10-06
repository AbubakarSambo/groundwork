-- THE PERSON SEES THEIR PATTERN FIRST, AND CAN ANSWER IT (Hafsah, 27 September 2026).
-- When a pattern had been seen in three periods, when the person it is about was first shown it,
-- and what they said is behind it. The lead reads it only after the person has had their turn.
ALTER TABLE "pattern_detections" ADD COLUMN "ready_at" TIMESTAMP(3);
ALTER TABLE "pattern_detections" ADD COLUMN "shown_to_person_at" TIMESTAMP(3);
ALTER TABLE "pattern_detections" ADD COLUMN "person_answer" TEXT;
ALTER TABLE "pattern_detections" ADD COLUMN "person_answered_at" TIMESTAMP(3);

-- Rows already seen in three periods, at release, start the person-first process on release day
-- (decision 62, 30 September 2026), never on the day they were last seen: the person is shown
-- theirs first, as if first shown today, and whoever runs the check-in reads it only after the
-- usual 3 days from the person being shown it, or 7 days if the person never opens a page that
-- shows it. Setting "ready_at" to the moment this migration runs, and leaving "shown_to_person_at"
-- unset, makes the existing rules in who-reads-a-pattern.ts produce exactly that: nobody's clock is
-- backdated to when the pattern was last seen, so nothing is readable by whoever runs the check-in
-- on release day itself.
UPDATE "pattern_detections"
SET "ready_at" = now()
WHERE cardinality("seen_in_sessions") >= 3 OR "periods_observed" >= 3;
