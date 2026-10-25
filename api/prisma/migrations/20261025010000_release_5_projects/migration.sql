-- RELEASE 5: PROJECTS (Hafsah, 24 October 2026). Add-only; can be run again. Off for every organisation.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_5_projects_on" BOOLEAN NOT NULL DEFAULT false;
