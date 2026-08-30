-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "owner_user_id" TEXT;


-- BACKFILL: every organisation that already exists gets an owner.
--
-- Its earliest admin, which is the person who signed up: `auth.service` creates the organisation
-- and that user in one transaction, and every later admin was promoted by somebody.
--
-- Without this, existing organisations would have no owner and no way to get one - the hand-over
-- is owner-only, so nobody could ever claim it. Leaving them null is not neutral, it is permanent.
UPDATE "organizations" o
SET "owner_user_id" = (
  SELECT u."id" FROM "users" u
  WHERE u."organization_id" = o."id"
    AND u."role" = 'ADMIN'
    AND u."deleted_at" IS NULL
  ORDER BY u."created_at" ASC
  LIMIT 1
)
WHERE o."owner_user_id" IS NULL;
