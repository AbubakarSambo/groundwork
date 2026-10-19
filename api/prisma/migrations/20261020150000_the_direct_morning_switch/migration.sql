-- THE DIRECT MORNING, A SWITCH PER ORGANISATION (Hafsah, 20 October 2026). Add-only; the statement can be run again.
--
-- What it does to rows already there: nothing that changes how they read or behave. Every organisation gets
-- direct_morning_on = false, which is off, so every lead, team member and admin reads exactly what they read today. It is
-- set on for one organisation at a time by scripts/the-direct-morning.ts, by its id. No check-in, setting, report or person
-- is read, changed or removed.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "direct_morning_on" BOOLEAN NOT NULL DEFAULT false;
