-- RELEASE 8: THE REMAINING SITUATIONS (Hafsah, 24 October 2026). Add-only; can be run again. Off for every organisation.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_8_situations_on" BOOLEAN NOT NULL DEFAULT false;
