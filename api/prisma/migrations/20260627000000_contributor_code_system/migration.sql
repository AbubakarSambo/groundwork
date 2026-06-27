-- Contributor code system: create tables + add billing columns

-- 1. Create contributor_codes table (full schema — was never created before)
CREATE TABLE IF NOT EXISTS "contributor_codes" (
    "id"                  TEXT         NOT NULL,
    "organization_id"     TEXT         NOT NULL,
    "code"                TEXT         NOT NULL,
    "sessions_granted"    INTEGER      NOT NULL DEFAULT 1,
    "sessions_used"       INTEGER      NOT NULL DEFAULT 0,
    "created_by_user_id"  TEXT         NOT NULL,
    "note"                TEXT,
    "allow_code_creation" BOOLEAN      NOT NULL DEFAULT false,
    "is_active"           BOOLEAN      NOT NULL DEFAULT true,
    "parent_code_id"      TEXT,
    "redeemed_by_user_id" TEXT,
    "expires_at"          TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '90 days',
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contributor_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "contributor_codes_code_key"            ON "contributor_codes"("code");
CREATE INDEX        IF NOT EXISTS "contributor_codes_organization_id_idx" ON "contributor_codes"("organization_id");

ALTER TABLE "contributor_codes"
  ADD CONSTRAINT "contributor_codes_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contributor_codes"
  ADD CONSTRAINT "contributor_codes_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "contributor_codes"
  ADD CONSTRAINT "contributor_codes_parent_code_id_fkey"
    FOREIGN KEY ("parent_code_id") REFERENCES "contributor_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contributor_codes"
  ADD CONSTRAINT "contributor_codes_redeemed_by_user_id_fkey"
    FOREIGN KEY ("redeemed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Create contributor_code_redemptions table
CREATE TABLE IF NOT EXISTS "contributor_code_redemptions" (
    "id"                  TEXT         NOT NULL,
    "code_id"             TEXT         NOT NULL,
    "ground_id"           TEXT         NOT NULL,
    "redeemed_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemed_by_user_id" TEXT,
    "free_reason"         TEXT,
    CONSTRAINT "contributor_code_redemptions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contributor_code_redemptions"
  ADD CONSTRAINT "contributor_code_redemptions_code_id_fkey"
    FOREIGN KEY ("code_id") REFERENCES "contributor_codes"("id") ON UPDATE CASCADE;
ALTER TABLE "contributor_code_redemptions"
  ADD CONSTRAINT "contributor_code_redemptions_ground_id_fkey"
    FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contributor_code_redemptions"
  ADD CONSTRAINT "contributor_code_redemptions_redeemed_by_user_id_fkey"
    FOREIGN KEY ("redeemed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Add billing columns to organizations
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "free_sessions_used"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "first_ground_used"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allow_code_creation" BOOLEAN NOT NULL DEFAULT false;

-- 4. Add billing columns to grounds
ALTER TABLE "grounds"
  ADD COLUMN IF NOT EXISTS "access_code_id"       UUID,
  ADD COLUMN IF NOT EXISTS "free_reason"          VARCHAR,
  ADD COLUMN IF NOT EXISTS "is_free_ground"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sessions_balance"     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "free_participant_cap" INTEGER NOT NULL DEFAULT 4;

-- 5. FK from grounds → contributor_codes (table now exists)
ALTER TABLE "grounds"
  ADD CONSTRAINT "grounds_access_code_id_fkey"
    FOREIGN KEY ("access_code_id") REFERENCES "contributor_codes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
