-- 18 November 2026. Add-only.
-- What a person said they had done against a target (said, not proven), one row per person per target, the newest round's number.
CREATE TABLE "ground_objective_said" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "objective_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "said" TEXT NOT NULL,
    "session_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ground_objective_said_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ground_objective_said_objective_id_participant_id_key" ON "ground_objective_said"("objective_id", "participant_id");
CREATE INDEX "ground_objective_said_ground_id_idx" ON "ground_objective_said"("ground_id");
ALTER TABLE "ground_objective_said" ADD CONSTRAINT "ground_objective_said_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "ground_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ground_objective_said" ADD CONSTRAINT "ground_objective_said_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
