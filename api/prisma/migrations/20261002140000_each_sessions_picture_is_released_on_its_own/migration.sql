-- DECISION 76, ITEM 4, 2 October 2026: each session's team picture is released on its own.
--
-- A report was released once, for the whole check-in, so a participant kept reading it as it grew
-- into later sessions that nobody had shared with them. This keeps, on the report, which sessions'
-- pictures have been released.
--
-- Every report already released is marked as released for the sessions it held when it was
-- released: every session up to the highest one anybody had finished at that moment. So nobody
-- loses what they could read when it was shared, and nobody gains a later session. A report never
-- released is released for no session. Nothing else is changed.
ALTER TABLE "reports" ADD COLUMN "released_sessions" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "reports" AS r
SET "released_sessions" = ARRAY(
  SELECT generate_series(
    1,
    GREATEST(1, COALESCE((
      SELECT MAX(c."session_number")
      FROM "check_ins" AS c
      WHERE c."ground_id" = r."ground_id"
        AND c."status" = 'COMPLETED'
        AND c."is_setup" = false
        AND c."completed_at" IS NOT NULL
        AND c."completed_at" <= r."released_at"
    ), 1))
  )
)
WHERE r."released_at" IS NOT NULL;
