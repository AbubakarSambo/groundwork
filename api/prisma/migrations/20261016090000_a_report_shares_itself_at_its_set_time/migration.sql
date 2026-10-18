-- A REPORT SHARES ITSELF AT ITS SET TIME, UNLESS THE LEAD HOLDS IT (Hafsah's answers 1 and 5, 16 October 2026). Add-only; every statement can be run again.
--
-- Each check-in may say the time of day its session's team report shares itself ("HH:MM" in the organisation's own day; null is the
-- product's default, 18:30, for a check-in that repeats). The sessions the lead held ("Hold it") wait until she shares them herself.
ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "report_shares_at" VARCHAR(5);
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "held_sessions" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
