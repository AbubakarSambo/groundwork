-- AlterTable
ALTER TABLE "person_objectives" ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "status_changed_at" TIMESTAMP(3);

