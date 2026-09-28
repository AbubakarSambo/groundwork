-- REOPEN EVERY CHECK-IN THAT RAN OUT OF TIME WHILE THERE WAS NO WAY BACK.
--
-- Until today STALLED sat with RESOLVED and CLOSED and had no exit, so every check-in that passed
-- its date is sitting dead with everything already answered in it. A customer found his that way:
-- "i let a few check-ins wait and they are now stalled, with no clear way to open them back up...
-- the whole thing would be of little to no use even if many of the users checked in."
--
-- They were stopped by a product fault, not by anybody's decision, so they are reopened here rather
-- than left for each lead to find and fix by hand.
--
-- ONLY THE ONES WITH WORK STILL OUTSTANDING. A stalled check-in where every session is complete
-- stopped because it was finished; reopening that one gives nobody anything to do and restarts its
-- billing, since the monthly sweep only counts ACTIVE grounds. So the condition is that somebody
-- still owes a check-in.
--
-- AND THEY GET REAL TIME, NOT A STATUS FLIP. Setting ACTIVE alone would hand every one of them
-- straight back to tonight's sweep. `timeline_days` is measured from the clock start, so this gives
-- each one thirty days from today and never shortens one that already had longer.
UPDATE "grounds" g
   SET status = 'ACTIVE',
       stalled_from_status = NULL,
       stalled_at = NULL,
       -- Cleared so the notice sweep warns them again before any of these could stall a second time.
       stall_warning_sent_at = NULL,
       timeline_days = GREATEST(
         g.timeline_days,
         (CURRENT_DATE - COALESCE(g.starts_at, g.created_at)::date)::int + 30
       ),
       -- Moved with it where one is set, or "89 days remaining" counts down to the old finish line.
       ends_at = CASE
         WHEN g.ends_at IS NULL THEN NULL
         ELSE COALESCE(g.starts_at, g.created_at)
              + make_interval(days => GREATEST(
                  g.timeline_days,
                  (CURRENT_DATE - COALESCE(g.starts_at, g.created_at)::date)::int + 30
                ))
       END
 WHERE g.status = 'STALLED'
   AND EXISTS (
     SELECT 1 FROM "check_ins" c
      WHERE c.ground_id = g.id
        AND c.status <> 'COMPLETED'
   );
