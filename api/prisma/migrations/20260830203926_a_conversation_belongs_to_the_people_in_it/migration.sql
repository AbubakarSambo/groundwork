-- AlterTable
ALTER TABLE "ground_documents" ADD COLUMN     "consent_confirmed_at" TIMESTAMP(3),
ADD COLUMN     "consent_confirmed_by_id" TEXT,
ADD COLUMN     "is_conversation" BOOLEAN NOT NULL DEFAULT false;

