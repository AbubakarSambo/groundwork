-- AlterTable
ALTER TABLE "pattern_detections" ADD COLUMN     "accuracy_rating" BOOLEAN,
ADD COLUMN     "rated_at" TIMESTAMP(3),
ADD COLUMN     "rated_by" TEXT;

-- CreateTable
CREATE TABLE "pattern_configs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "consecutive_periods" INTEGER NOT NULL DEFAULT 3,
    "output_score_max" DOUBLE PRECISION,
    "output_score_min" DOUBLE PRECISION,
    "thinking_score_max" DOUBLE PRECISION,
    "thinking_score_min" DOUBLE PRECISION,
    "meeting_score_max" DOUBLE PRECISION,
    "meeting_score_min" DOUBLE PRECISION,
    "specificity_score_max" DOUBLE PRECISION,
    "keyword_count_min" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "pattern_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pattern_configs_code_key" ON "pattern_configs"("code");

-- CreateIndex
CREATE INDEX "pattern_detections_code_accuracy_rating_idx" ON "pattern_detections"("code", "accuracy_rating");
