-- Anchor scenario, piece 15: one empty column on grounds, "started_from". It is written only when a lead saves a
-- check-in from the anchor conversation while the anchor switch is on. Every check-in that exists keeps it empty.

-- AlterTable
ALTER TABLE "grounds" ADD COLUMN     "started_from" TEXT;
