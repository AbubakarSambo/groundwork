-- STALLED stops being terminal. It is written by the nightly sweep when a check-in passes the time
-- it was given, and it used to sit with RESOLVED and CLOSED - two decisions somebody took - so it
-- inherited their one property: no way back. These three columns give it a way out: what it was
-- before the time ran out, when that happened, and whether the lead was warned first.
ALTER TABLE "grounds" ADD COLUMN "stalled_from_status" "GroundStatus";
ALTER TABLE "grounds" ADD COLUMN "stalled_at" TIMESTAMP(3);
ALTER TABLE "grounds" ADD COLUMN "stall_warning_sent_at" TIMESTAMP(3);
