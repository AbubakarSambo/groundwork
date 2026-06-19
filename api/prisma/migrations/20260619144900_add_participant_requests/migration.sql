-- CreateEnum
CREATE TYPE "ParticipantRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "participant_requests" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "requested_by_email" TEXT NOT NULL,
    "requested_email" TEXT NOT NULL,
    "requested_name" TEXT,
    "reason" TEXT NOT NULL,
    "status" "ParticipantRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participant_requests_ground_id_idx" ON "participant_requests"("ground_id");

-- AddForeignKey
ALTER TABLE "participant_requests" ADD CONSTRAINT "participant_requests_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
