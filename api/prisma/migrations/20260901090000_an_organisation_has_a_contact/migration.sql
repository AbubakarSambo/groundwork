-- AN ORGANISATION THAT HAS NO CONTACT EMAIL TRAPS ITS OWN ADMIN.
--
-- `RequireOrgSetup` in the client redirects when `role === 'ADMIN'` and
-- `organization.email` is empty, and that redirect fires on every protected
-- route. Organisations created before the contact email was set on every
-- creation path have `email = NULL` permanently, so their admin cannot leave
-- /org/setup - including when they have been invited into somebody else's
-- check-in and have real work waiting.
--
-- Reported from staging: added to a check-in, sent to "Set up your organization"
-- with no way to say they were joining an existing team.
--
-- The contact email is the person who set the organisation up, which is what
-- every current creation path already writes. Three fallbacks, in order:
--   1. the recorded owner
--   2. the earliest admin, where no owner was ever recorded
--   3. the earliest member, for an organisation with no admin at all
-- An organisation with no users at all is left alone: there is nobody to be
-- trapped, and inventing an address would be worse than leaving it null.
UPDATE "organizations" o
SET "email" = COALESCE(
  (SELECT u."email" FROM "users" u WHERE u."id" = o."owner_user_id"),
  (SELECT u."email" FROM "users" u
     WHERE u."organization_id" = o."id" AND u."role" = 'ADMIN'
     ORDER BY u."created_at" ASC LIMIT 1),
  (SELECT u."email" FROM "users" u
     WHERE u."organization_id" = o."id"
     ORDER BY u."created_at" ASC LIMIT 1)
)
WHERE o."email" IS NULL;
