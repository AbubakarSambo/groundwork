-- An org admin accepts a ground before anybody is invited to it.
--
-- Added to the FRONT of nothing: Postgres appends enum values, and the order in the
-- type does not matter to any query here. What matters is that existing rows keep
-- their status untouched - no backfill, so nothing in flight is suddenly pending.
ALTER TYPE "GroundStatus" ADD VALUE IF NOT EXISTS 'AWAITING_APPROVAL';

-- Who decided, when, and why if they said no. Nullable: a ground that never needed
-- accepting has nothing to record, and existing rows are exactly that.
ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "approved_by_id" TEXT;
ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);
ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "decline_reason" TEXT;
