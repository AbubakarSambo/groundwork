-- AN ORGANISATION MUST HAVE A CONTACT EMAIL, ENFORCED HERE RATHER THAN REMEMBERED.
--
-- An organisation created without one sends its admin to "Set up your organization" on every
-- sign-in, forever. `20260901090000_an_organisation_has_a_contact` filled in the rows that existed;
-- this stops another one being made. Every application path already sets it - the last thing that
-- did not was the seed, fixed alongside this.
--
-- Two backfills before the constraint, because a migration that fails on real data blocks a deploy.

-- 1. ORGANISATIONS WITH PEOPLE IN THEM: the founding admin's address, same order as the first
--    backfill - the owner, then the earliest admin, then the earliest member. Catches anything
--    created between that migration and this one.
UPDATE "organizations" o
SET "email" = COALESCE(
  (SELECT u."email" FROM "users" u
    WHERE u."id" = o."owner_user_id"),
  (SELECT u."email" FROM "users" u
    WHERE u."organization_id" = o."id" AND u."role" = 'ADMIN' AND u."deleted_at" IS NULL
    ORDER BY u."created_at" ASC LIMIT 1),
  (SELECT u."email" FROM "users" u
    WHERE u."organization_id" = o."id" AND u."deleted_at" IS NULL
    ORDER BY u."created_at" ASC LIMIT 1)
)
WHERE o."email" IS NULL;

-- 2. ORGANISATIONS WITH NOBODY IN THEM AT ALL. There is no address to derive, because there is
--    nobody to derive it from - the first backfill left these behind for exactly that reason.
--
--    A row nobody belongs to cannot trap anybody: the bug this prevents is about an admin being
--    sent to a setup screen, and there is no admin. So rather than block the constraint on rows
--    that cannot hurt anyone, they get a placeholder that is VISIBLY a placeholder. `.invalid` is
--    reserved by RFC 2606 and can never resolve, so nothing is ever sent to it by accident.
--
--    Deliberately narrow: `NOT EXISTS` on users, so this cannot touch a real organisation.
UPDATE "organizations" o
SET "email" = 'no-contact+' || o."slug" || '@groundwork.invalid'
WHERE o."email" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."organization_id" = o."id");

-- 3. And now it cannot happen again.
ALTER TABLE "organizations" ALTER COLUMN "email" SET NOT NULL;
