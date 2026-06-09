-- AlterTable
ALTER TABLE "ground_participants" ADD COLUMN     "last_nudged_at" TIMESTAMP(3),
ADD COLUMN     "solo_artifact" TEXT,
ADD COLUMN     "solo_artifact_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "engagement" JSONB;

-- AlterTable
ALTER TABLE "resolutions" DROP COLUMN "confirmed_by_initiator",
DROP COLUMN "confirmed_by_participant",
DROP COLUMN "confirmed_initiator_at",
DROP COLUMN "confirmed_participant_at";

-- CreateTable
CREATE TABLE "resolution_confirmations" (
    "id" TEXT NOT NULL,
    "resolution_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "end_state" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolution_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resolution_confirmations_resolution_id_idx" ON "resolution_confirmations"("resolution_id");

-- CreateIndex
CREATE UNIQUE INDEX "resolution_confirmations_resolution_id_participant_id_key" ON "resolution_confirmations"("resolution_id", "participant_id");

-- AddForeignKey
ALTER TABLE "resolution_confirmations" ADD CONSTRAINT "resolution_confirmations_resolution_id_fkey" FOREIGN KEY ("resolution_id") REFERENCES "resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolution_confirmations" ADD CONSTRAINT "resolution_confirmations_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

