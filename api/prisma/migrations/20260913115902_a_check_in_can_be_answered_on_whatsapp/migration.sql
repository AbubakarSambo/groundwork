-- Nullable on purpose: null means "whatever the organisation does", which is what every existing
-- ground already did. A default would have decided for all of them.
ALTER TABLE "grounds" ADD COLUMN "over_whatsapp" BOOLEAN;
