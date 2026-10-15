-- Decision 57, items 4 and 5: what backed a detection, and a low-confidence role confirmed before use.

-- AlterTable
ALTER TABLE "pattern_detections"
  ADD COLUMN "evidence_source" TEXT;

-- AlterTable
ALTER TABLE "ground_participants"
  ADD COLUMN "detected_function_confirmed_at" TIMESTAMP(3),
  ADD COLUMN "detected_function_confirmed_by" TEXT;
