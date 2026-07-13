-- CreateTable
CREATE TABLE "lead_context_notes" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT,
    "author_user_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_context_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_context_notes_ground_id_idx" ON "lead_context_notes"("ground_id");

-- AddForeignKey
ALTER TABLE "lead_context_notes" ADD CONSTRAINT "lead_context_notes_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_context_notes" ADD CONSTRAINT "lead_context_notes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
