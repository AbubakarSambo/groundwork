-- When somebody wants the first coaching conversation, asked before they decide.
--
-- The point of a coach at that step is help shaping the check-in they are about to set up, which is
-- worth nothing if the first conversation lands after they have already set it up.
--
-- A REQUEST, NOT A BOOKING. Nothing here holds a slot in anybody's calendar. Nullable, because
-- asking without naming a time is still a perfectly good request.
ALTER TABLE "coach_requests" ADD COLUMN "preferred_at" TIMESTAMP(3);
