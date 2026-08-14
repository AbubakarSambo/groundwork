-- THE SAME BACKFILL AGAIN, FOR EVERYBODY WHO SIGNED UP AFTER THE FIRST ONE.
--
-- `20260812080000_organization_memberships` backfilled every user who existed that day and no code
-- was ever written to create a membership for anybody after. So the multi-organisation feature -
-- the routes, the reads, that migration - worked only for users who predated it, and
-- `/auth/my-organizations` returned an empty list to everyone since.
--
-- The create path is fixed in `PrismaService`, where it cannot be forgotten by the tenth caller.
-- This catches the people who signed up in between.
INSERT INTO "organization_memberships" ("id", "user_id", "organization_id", "role", "created_at")
SELECT gen_random_uuid(), u."id", u."organization_id", u."role", COALESCE(u."created_at", CURRENT_TIMESTAMP)
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "organization_memberships" m
  WHERE m."user_id" = u."id" AND m."organization_id" = u."organization_id"
)
ON CONFLICT ("user_id", "organization_id") DO NOTHING;
