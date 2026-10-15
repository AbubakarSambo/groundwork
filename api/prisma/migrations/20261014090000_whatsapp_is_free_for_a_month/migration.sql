-- WhatsApp is on for every organisation for a free month (Hafsah, 13 October 2026, evening). Add-only; every statement can be run again.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "whatsapp_free_until" TIMESTAMP(3);
ALTER TABLE "organizations" ALTER COLUMN "whatsapp_free_until" SET DEFAULT (now() + '1 mon'::interval);

-- Organisations already here get the same free month, from today, and lose nothing: one that already added WhatsApp keeps it.
UPDATE "organizations" SET "whatsapp_free_until" = now() + '1 mon'::interval WHERE "whatsapp_free_until" IS NULL;
