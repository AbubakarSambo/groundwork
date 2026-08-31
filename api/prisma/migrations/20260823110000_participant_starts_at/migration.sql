-- When a participant's work starts, which is not when they joined the ground.
--
-- A new hire named at setup three weeks before their first day has joined the ground and has not
-- started the job. Without this column, a period before their start date looks exactly like a period
-- they were present for and went quiet in.
--
-- Nullable and additive: null means the work was already underway, which is true of every existing row.
ALTER TABLE "ground_participants" ADD COLUMN "starts_at" TIMESTAMP(3);
