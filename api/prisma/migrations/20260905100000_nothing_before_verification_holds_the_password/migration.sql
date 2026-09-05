-- A pending signup now carries everything a signup needs, so no Organization and
-- no ADMIN User has to exist before the address is proved. GW-001, last two paths.
--
-- Both nullable: the entry flow sets neither, the magic-link path sets only the
-- name, and the password path sets both.
ALTER TABLE "pending_signups" ADD COLUMN "last_name" TEXT;
ALTER TABLE "pending_signups" ADD COLUMN "password_hash" TEXT;
