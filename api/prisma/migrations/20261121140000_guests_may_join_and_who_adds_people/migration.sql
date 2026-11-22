-- Two settings under "Who can join" on People (Hafsah, 21 November 2026), and the role the invite link gives.
-- Additive, with defaults, so every organisation already here reads exactly as before: guests cannot join the
-- organisation, only admins add people, and the invite link gives "Takes part".
ALTER TABLE "organizations" ADD COLUMN "guests_may_join" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN "who_may_add_people" TEXT NOT NULL DEFAULT 'ADMINS';
ALTER TABLE "organizations" ADD COLUMN "invite_link_role" TEXT NOT NULL DEFAULT 'MEMBER';
