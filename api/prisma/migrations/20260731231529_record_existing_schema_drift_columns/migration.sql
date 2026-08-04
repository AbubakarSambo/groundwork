-- Part two of recording the undocumented drift. Separate migration because the
-- enum addition above cannot share a transaction with these statements.

-- Defaults and types the code assumes but the recorded history never set.
ALTER TABLE "contributor_codes" ALTER COLUMN "expires_at" SET DEFAULT NOW() + INTERVAL '90 days';

ALTER TABLE "grounds" ALTER COLUMN "join_token" SET DATA TYPE TEXT;
ALTER TABLE "grounds" ALTER COLUMN "free_reason" SET DATA TYPE TEXT;
ALTER TABLE "grounds" ALTER COLUMN "is_free_ground" SET DEFAULT true;

-- Columns that exist in the live databases and are now declared in
-- schema.prisma. IF NOT EXISTS so this is safe against a database that already
-- has them (which every live one does).
ALTER TABLE "prompt_versions" ADD COLUMN IF NOT EXISTS "is_draft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "prompt_versions" ADD COLUMN IF NOT EXISTS "activated_by" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "contributor_bypass" BOOLEAN NOT NULL DEFAULT false;
