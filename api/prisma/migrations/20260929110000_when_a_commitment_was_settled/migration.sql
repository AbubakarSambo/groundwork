-- Week 9: when a commitment was settled, and by which check-in. Adds two nullable columns; changes no data.
ALTER TABLE "ground_commitments" ADD COLUMN "settled_at" TIMESTAMP(3);
ALTER TABLE "ground_commitments" ADD COLUMN "settled_in_check_in_id" TEXT;
