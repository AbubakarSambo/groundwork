-- The invitation says somebody can simply ignore it. The reminders did not honour that.
ALTER TABLE "ground_participants" ADD COLUMN "reminders_stopped_at" TIMESTAMP(3);
ALTER TABLE "ground_participants" ADD COLUMN "stop_reminders_token" TEXT;
CREATE UNIQUE INDEX "ground_participants_stop_reminders_token_key" ON "ground_participants"("stop_reminders_token");
