-- LINKS BETWEEN CHECK-INS (U.16, D3). A handoff can say which other check-in it waits on. The column is
-- empty until the engine writes it (docs/requests-to-engine.md, request 18). Nothing existing changes.
ALTER TABLE "ground_dependencies" ADD COLUMN "waiting_on_ground_id" TEXT;

CREATE INDEX "ground_dependencies_waiting_on_ground_id_idx" ON "ground_dependencies"("waiting_on_ground_id");
