-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('DOCUMENT_AT_AGREEMENT', 'DOCUMENT_AFTER', 'CHECK_IN', 'ANCHORED_RECALL', 'UNANCHORED_RECALL');

-- AlterTable
ALTER TABLE "check_ins" ADD COLUMN     "next_commitment" TEXT;

-- AlterTable
ALTER TABLE "grounds" ADD COLUMN     "timeline_weeks" INTEGER;

-- AlterTable
ALTER TABLE "record_entries" ADD COLUMN     "evidenceType" "EvidenceType" NOT NULL DEFAULT 'CHECK_IN';

-- AlterTable
ALTER TABLE "resolutions" ADD COLUMN     "decision_rights" JSONB;
