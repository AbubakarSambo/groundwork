-- AlterTable
ALTER TABLE "prompt_versions" ADD COLUMN     "activated_by" TEXT,
ADD COLUMN     "is_draft" BOOLEAN NOT NULL DEFAULT false;
