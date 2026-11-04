-- When a review in progress was last read again from the record. Add-only.
ALTER TABLE "performance_reviews" ADD COLUMN IF NOT EXISTS "record_read_at" TIMESTAMP(3);
