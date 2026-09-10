-- A BLOCKER FROM SESSION ONE IS NOT A BLOCKER IN SESSION TWELVE. The report read every dependency on
-- the ground under a heading that said "this session", and movement was a lifetime delta against a
-- prevCount that defaults to zero. Movement is now the difference between two snapshots, taken when a
-- round closes; with only one snapshot it is not known, and the report says so.
CREATE TABLE "ground_objective_snapshots" (
  "id"             TEXT NOT NULL,
  "ground_id"      TEXT NOT NULL,
  "objective_id"   TEXT NOT NULL,
  "session_number" INTEGER NOT NULL,
  "count"          INTEGER NOT NULL,
  "taken_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ground_objective_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ground_objective_snapshots_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "ground_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ground_objective_snapshots_objective_id_session_number_key" ON "ground_objective_snapshots"("objective_id", "session_number");
CREATE INDEX "ground_objective_snapshots_ground_id_session_number_idx" ON "ground_objective_snapshots"("ground_id", "session_number");
