-- RELEASE 4: A TARGET'S UNIT (Hafsah, 24 October 2026). Add-only; can be run again. Every target gets unit = NULL, which reads exactly as today.
ALTER TABLE "ground_objectives" ADD COLUMN IF NOT EXISTS "unit" TEXT;
