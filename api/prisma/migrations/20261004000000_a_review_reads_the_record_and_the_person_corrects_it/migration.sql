-- Decision 85, item 4 (build step 12): a review holds what Groundwork understands from the record, and
-- the person can correct each line. Two empty columns on performance_reviews and one new, empty table.

-- AlterTable
ALTER TABLE "performance_reviews" ADD COLUMN     "record_from" TIMESTAMP(3),
ADD COLUMN     "record_read" JSONB;

-- CreateTable
CREATE TABLE "performance_review_corrections" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "line_key" VARCHAR(120) NOT NULL,
    "what_is_true" TEXT NOT NULL,
    "by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_review_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_review_corrections_review_id_line_key_created_a_idx" ON "performance_review_corrections"("review_id", "line_key", "created_at");

-- AddForeignKey
ALTER TABLE "performance_review_corrections" ADD CONSTRAINT "performance_review_corrections_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "performance_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
