-- Add contributor code system columns

ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "free_sessions_used" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "first_ground_used" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allow_code_creation" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "grounds"
  ADD COLUMN IF NOT EXISTS "access_code_id" UUID,
  ADD COLUMN IF NOT EXISTS "free_reason" VARCHAR,
  ADD COLUMN IF NOT EXISTS "is_free_ground" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sessions_balance" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "free_participant_cap" INTEGER NOT NULL DEFAULT 4;

ALTER TABLE "contributor_codes"
  ADD COLUMN IF NOT EXISTS "allow_code_creation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "parent_code_id" UUID,
  ADD COLUMN IF NOT EXISTS "redeemed_by_user_id" UUID;

UPDATE "contributor_codes" SET "expires_at" = NOW() + INTERVAL '90 days' WHERE "expires_at" IS NULL;

ALTER TABLE "contributor_codes"
  ALTER COLUMN "expires_at" SET NOT NULL,
  ALTER COLUMN "expires_at" SET DEFAULT NOW() + INTERVAL '90 days';

ALTER TABLE "contributor_code_redemptions"
  ADD COLUMN IF NOT EXISTS "redeemed_by_user_id" UUID,
  ADD COLUMN IF NOT EXISTS "free_reason" VARCHAR;

ALTER TABLE "grounds"
  ADD CONSTRAINT "grounds_access_code_id_fkey"
  FOREIGN KEY ("access_code_id") REFERENCES "contributor_codes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
