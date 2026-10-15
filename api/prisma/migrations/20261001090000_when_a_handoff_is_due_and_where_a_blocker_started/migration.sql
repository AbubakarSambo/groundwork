-- REQUEST 18 (D3). A handoff keeps the person's own words for when it is due, and the day those
-- words meant when they name one. And where a blocker started is stored, without names, once per
-- handoff it was followed from. Nothing existing changes.
ALTER TABLE "ground_dependencies" ADD COLUMN "due_said" TEXT;
ALTER TABLE "ground_dependencies" ADD COLUMN "due_on" DATE;

CREATE TABLE "blocker_traces" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "anchor_dependency_id" TEXT NOT NULL,
    "end_ground_id" TEXT NOT NULL,
    "start_ground_id" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "where_it_started" TEXT NOT NULL,
    "decision_needed" TEXT,
    "decision_owner_participant_id" TEXT,
    "input_key" TEXT NOT NULL,
    "prompt_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocker_traces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blocker_traces_anchor_dependency_id_key" ON "blocker_traces"("anchor_dependency_id");
CREATE INDEX "blocker_traces_end_ground_id_idx" ON "blocker_traces"("end_ground_id");
CREATE INDEX "blocker_traces_organization_id_idx" ON "blocker_traces"("organization_id");
