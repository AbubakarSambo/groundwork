-- AlterEnum
ALTER TYPE "GroundStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "grounds" ADD COLUMN     "paused_at" TIMESTAMP(3);
