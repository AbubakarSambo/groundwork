-- CreateEnum
CREATE TYPE "WorkMentionKind" AS ENUM ('CREDIT', 'COVERAGE', 'BLOCKED_BY');

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "leadership_gaps" JSONB;

-- CreateTable
CREATE TABLE "work_mentions" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "source_participant_id" TEXT NOT NULL,
    "about_participant_id" TEXT NOT NULL,
    "check_in_id" TEXT,
    "session_number" INTEGER NOT NULL DEFAULT 1,
    "kind" "WorkMentionKind" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_mentions_ground_id_idx" ON "work_mentions"("ground_id");

-- CreateIndex
CREATE INDEX "work_mentions_about_participant_id_idx" ON "work_mentions"("about_participant_id");

-- AddForeignKey
ALTER TABLE "work_mentions" ADD CONSTRAINT "work_mentions_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_mentions" ADD CONSTRAINT "work_mentions_source_participant_id_fkey" FOREIGN KEY ("source_participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_mentions" ADD CONSTRAINT "work_mentions_about_participant_id_fkey" FOREIGN KEY ("about_participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_mentions" ADD CONSTRAINT "work_mentions_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
