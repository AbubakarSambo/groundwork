-- RELEASE 7: PEOPLE SCENARIOS AND A REVIEW BUILT FROM CHECK-INS (Hafsah, 24 October 2026). Add-only; can be run again. Off for every organisation.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_7_people_on" BOOLEAN NOT NULL DEFAULT false;
