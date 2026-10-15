-- A QUESTION ABOUT A REQUEST, AND A REASON FOR A DECLINE (decision 85, build step 7).
--
-- The person who decides a leave request can now ask the person who made it a question, and the
-- request keeps waiting until it is decided. Each question and its answer is kept in a new, empty
-- table. A decline can now carry the reason the person who declined it gave, told to the person who
-- asked; the new column is empty on every request already kept.

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "decline_reason" TEXT;

-- CreateTable
CREATE TABLE "suite_questions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "suite" VARCHAR(16) NOT NULL,
    "ref" VARCHAR(200) NOT NULL,
    "asked_by_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "asked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMP(3),

    CONSTRAINT "suite_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suite_questions_organization_id_suite_ref_idx" ON "suite_questions"("organization_id", "suite", "ref");

-- CreateIndex
CREATE INDEX "suite_questions_organization_id_to_user_id_answered_at_idx" ON "suite_questions"("organization_id", "to_user_id", "answered_at");

-- AddForeignKey
ALTER TABLE "suite_questions" ADD CONSTRAINT "suite_questions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
