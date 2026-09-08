-- The report page decides "are you reading a stale version" by comparing the report's age with the
-- newest completed check-in, and only had created_at. Regeneration upserts the row, so that stayed
-- at first generation for ever and the banner could never clear.
ALTER TABLE "reports" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
