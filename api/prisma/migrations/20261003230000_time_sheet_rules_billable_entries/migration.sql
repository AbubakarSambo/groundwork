-- Decision 85, build step 11. Billable or not, as the person said of one entry of hours.
-- Null: it follows the time sheet rules for its client or project. Empty on every entry already kept.
ALTER TABLE "time_entries" ADD COLUMN     "billable" BOOLEAN;
