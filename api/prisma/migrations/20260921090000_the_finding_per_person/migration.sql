-- The finding per person, written by the product. See the-finding-per-person.ts.
ALTER TABLE "reports" ADD COLUMN "findings" JSONB;
