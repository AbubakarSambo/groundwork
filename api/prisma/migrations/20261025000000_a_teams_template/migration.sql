-- RELEASE 4: A TEAM'S TEMPLATE (Hafsah, 24 October 2026). Add-only; can be run again. Every check-in gets template_id = NULL, which reads exactly as today.
ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "template_id" TEXT;
