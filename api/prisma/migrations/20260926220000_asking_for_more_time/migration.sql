-- ASKING FOR MORE TIME (U.3, #/join/outoftime).
--
-- When a person last asked the lead to give a check-in that ran out more time. Once a day.
ALTER TABLE "ground_participants" ADD COLUMN "more_time_asked_at" TIMESTAMP(3);
