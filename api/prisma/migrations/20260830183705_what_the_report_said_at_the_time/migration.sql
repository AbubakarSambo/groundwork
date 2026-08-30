-- CreateTable
CREATE TABLE "report_rounds" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "shared_picture" TEXT NOT NULL,
    "agreements" JSONB NOT NULL,
    "divergences" JSONB NOT NULL,
    "central_question" TEXT NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL,
    "amended_at" TIMESTAMP(3),
    "amended_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_rounds_ground_id_round_idx" ON "report_rounds"("ground_id", "round");

-- CreateIndex
CREATE UNIQUE INDEX "report_rounds_ground_id_round_key" ON "report_rounds"("ground_id", "round");

-- AddForeignKey
ALTER TABLE "report_rounds" ADD CONSTRAINT "report_rounds_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

