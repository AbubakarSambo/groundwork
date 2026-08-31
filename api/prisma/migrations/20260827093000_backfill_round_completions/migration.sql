-- Rounds that closed before there was anywhere to record them.
--
-- The previous migration created the table; it did not fill it. Every round that had already closed
-- therefore read as still open, because the screen now asks for a row instead of counting - so
-- adding the record correctly would have quietly regressed every ground that already finished one.
--
-- A separate migration rather than an edit to the one before it: that one has been applied, and
-- rewriting an applied migration is how a schema and its history stop agreeing.
--
-- The rule is the same one the code uses: a round is closed when every participant who is not
-- managing-only has a COMPLETED check-in at that session number. `participant_count` is filled from
-- the roster as it stands now, which is the best available answer for a round that closed in the
-- past - it is recorded so that later joiners cannot make a closed round look reopened, and it
-- cannot reconstruct a roster nobody wrote down.

INSERT INTO "round_completions" ("id", "ground_id", "round_number", "participant_count", "completed_at")
SELECT
    gen_random_uuid(),
    c."ground_id",
    c."session_number",
    COUNT(*)::int,
    MAX(c."completed_at")
FROM "check_ins" c
JOIN "ground_participants" p ON p."id" = c."participant_id"
WHERE c."status" = 'COMPLETED'
  AND p."managing_only" = false
  AND c."completed_at" IS NOT NULL
GROUP BY c."ground_id", c."session_number"
HAVING COUNT(*) = (
    SELECT COUNT(*) FROM "ground_participants" gp
    WHERE gp."ground_id" = c."ground_id" AND gp."managing_only" = false
)
ON CONFLICT ("ground_id", "round_number") DO NOTHING;
