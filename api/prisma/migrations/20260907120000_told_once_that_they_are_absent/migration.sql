-- The absence reminder fired only on the one day `daysElapsed === 14` was exactly true, so a cron
-- that missed that morning never sent it at all. Now that a passed chase day is still due, the
-- reminder needs somewhere to record that it has been sent, or it would go out every morning.
ALTER TABLE "ground_participants" ADD COLUMN "absence_told_at" TIMESTAMP(3);
