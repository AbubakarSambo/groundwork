-- ACCESS TO THE API IS ASKED FOR AND GRANTED, NOT BOUGHT.
--
-- The old gate was a live subscription. It had two problems and only one was
-- about money: every integration test waited on a billing state, and we could
-- not use our own API in our own back office without paying ourselves — which
-- is the acceptance test for the whole thing.
--
-- What a customer pays for and what a customer may connect to are two
-- decisions. Tying them together meant neither could move without the other.
CREATE TYPE "ApiAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'WITHDRAWN');

CREATE TABLE "api_access_requests" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "requested_by_user_id" TEXT NOT NULL,
  "what_for" TEXT NOT NULL,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "ApiAccessStatus" NOT NULL DEFAULT 'PENDING',
  "decided_by_user_id" TEXT,
  "decided_at" TIMESTAMP(3),
  "note" TEXT,

  CONSTRAINT "api_access_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "api_access_requests_organization_id_key" ON "api_access_requests"("organization_id");
CREATE INDEX "api_access_requests_status_requested_at_idx" ON "api_access_requests"("status", "requested_at");

ALTER TABLE "api_access_requests"
  ADD CONSTRAINT "api_access_requests_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ANYBODY ALREADY PAYING KEEPS WORKING.
--
-- The gate is changing under organisations that did nothing wrong, so a live
-- subscription becomes an approved request rather than a locked door. Recorded
-- as a real decision with a note saying where it came from, because a row that
-- appeared from nowhere is exactly what this table exists to stop.
INSERT INTO "api_access_requests" ("id", "organization_id", "requested_by_user_id", "what_for", "status", "decided_at", "note")
SELECT
  gen_random_uuid()::text,
  o."id",
  'migration',
  'Held a live subscription when access stopped being something you buy.',
  'APPROVED',
  NOW(),
  'Granted automatically: this organisation was already entitled to the API under the paid gate.'
FROM "organizations" o
WHERE o."subscription_plan" IS NOT NULL AND o."subscription_status" = 'active';
