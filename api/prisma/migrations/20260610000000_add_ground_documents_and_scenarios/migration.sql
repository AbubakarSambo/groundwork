-- AlterEnum
ALTER TYPE "GroundScenario" ADD VALUE 'NEW_MANAGER';
ALTER TYPE "GroundScenario" ADD VALUE 'CONTRACT_RENEWAL';
ALTER TYPE "GroundScenario" ADD VALUE 'CRISIS_ALIGNMENT';

-- CreateTable
CREATE TABLE "ground_documents" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ground_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ground_documents_ground_id_participant_id_idx" ON "ground_documents"("ground_id", "participant_id");

-- AddForeignKey
ALTER TABLE "ground_documents" ADD CONSTRAINT "ground_documents_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_documents" ADD CONSTRAINT "ground_documents_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
