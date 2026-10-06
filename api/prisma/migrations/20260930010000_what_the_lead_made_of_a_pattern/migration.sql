-- Decision 57, items 2 and 3: what the lead made of a pattern, after talking it through.

-- CreateEnum
CREATE TYPE "LeadPatternMark" AS ENUM ('RIGHT', 'WRONG', 'NOT_SURE');

-- AlterTable
ALTER TABLE "pattern_detections"
  ADD COLUMN "lead_mark" "LeadPatternMark",
  ADD COLUMN "lead_marked_at" TIMESTAMP(3),
  ADD COLUMN "lead_marked_by" TEXT,
  ADD COLUMN "talked_about_at" TIMESTAMP(3),
  ADD COLUMN "talked_about_by" TEXT,
  ADD COLUMN "talked_about_at_period" INTEGER;
