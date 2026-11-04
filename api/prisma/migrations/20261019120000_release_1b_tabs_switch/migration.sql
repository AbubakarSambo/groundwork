-- RELEASE 1B'S NEW CHECK-IN TABS, A SWITCH PER ORGANISATION (Hafsah, 18 October 2026: existing users keep the tabs they
-- have until their organisation is switched on). Add-only; the statement can be run again.
--
-- What it does to rows already there: every existing organisation gets the column set to false, so each one keeps People and
-- setup exactly as it reads today. Nothing else is read, changed or removed, and no check-in is touched. A new organisation
-- also starts at false. Groundwork staff switch it on per organisation in Admin, Orgs; a "(test)" organisation is switched
-- on by script.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_1b_tabs_on" BOOLEAN NOT NULL DEFAULT false;
