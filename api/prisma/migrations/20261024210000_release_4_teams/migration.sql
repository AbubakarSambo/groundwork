-- RELEASE 4, GOALS AND TARGETS FOR EVERY KIND OF TEAM, ONE SWITCH PER ORGANISATION (Hafsah, 24 October 2026). Add-only; can be run again.
--
-- What it does to rows already there: nothing that changes how they read or behave. Every organisation gets release_4_teams_on = false,
-- so every board is drawn exactly as today. It is set on for one organisation at a time by scripts/release-4-teams.ts, by its id.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_4_teams_on" BOOLEAN NOT NULL DEFAULT false;
