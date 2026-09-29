-- Week 6: "Confirmed by the person who received it". Adds two nullable columns; changes no data.
ALTER TABLE "record_entries" ADD COLUMN "confirmed_at" TIMESTAMP(3);
ALTER TABLE "record_entries" ADD COLUMN "confirmed_by_participant_id" TEXT;
