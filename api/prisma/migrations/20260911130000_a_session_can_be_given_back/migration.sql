-- A SESSION CAN BE GIVEN BACK. There was no refund, reversal or credit anywhere in billing, which
-- made every consumption defect permanent from the customer's side. A platform admin can credit
-- one session with a reason on the ledger; this is the ledger row type for it.
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'CREDIT';

-- AN EXTENSION SPENT ON A CHECK-IN THAT NEVER NEEDED IT. claimFreeExtension had no free-ground guard,
-- so an organisation's one extension could land on a check-in with unlimited sessions, the person
-- was told "Free session added", and the flag never reset. Guarded in code now. Anybody it already
-- happened to gets their extension back.
UPDATE "organizations" o
SET "free_extension_used" = false
FROM "billing_events" e
JOIN "grounds" g ON g."id" = e."ground_id"
WHERE e."organization_id" = o."id"
  AND e."type" = 'FREE_EXTENSION'
  AND g."is_free_ground" = true;
