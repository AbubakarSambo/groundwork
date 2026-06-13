-- AlterTable
ALTER TABLE "check_ins" ADD COLUMN     "closed_reason" TEXT,
ADD COLUMN     "willingness_confirmed" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "grounds" ADD COLUMN     "billing_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payment_confirmed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "record_entries" ADD COLUMN     "anchored_question_id" TEXT,
ADD COLUMN     "dimension_thread_key" TEXT,
ADD COLUMN     "recall_based" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "disclaimer_acknowledgements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "text_version" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disclaimer_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disclaimer_acknowledgements_ground_id_idx" ON "disclaimer_acknowledgements"("ground_id");

-- CreateIndex
CREATE UNIQUE INDEX "disclaimer_acknowledgements_user_id_ground_id_key" ON "disclaimer_acknowledgements"("user_id", "ground_id");

-- AddForeignKey
ALTER TABLE "disclaimer_acknowledgements" ADD CONSTRAINT "disclaimer_acknowledgements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclaimer_acknowledgements" ADD CONSTRAINT "disclaimer_acknowledgements_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
