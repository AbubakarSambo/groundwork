-- FINANCE CHECKS, CODES AND PAYS AN APPROVED REQUEST TO SPEND (decision 85, build step 10).
--
-- After the last approval, whoever looks after finance checks the request, records the budget line it
-- is paid from, notes the receipt or quote it has had (only that it was given; no file), and marks it
-- paid with the day it was paid. Six new columns on requests to spend, all empty on every request
-- already kept. Who did each step and when is also kept in the existing `suite_events` table. Nothing
-- existing is changed.

-- AlterTable
ALTER TABLE "spend_requests" ADD COLUMN     "code" VARCHAR(80),
ADD COLUMN     "evidence_given" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "paid_by_id" TEXT,
ADD COLUMN     "paid_on" DATE,
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by_id" TEXT;
