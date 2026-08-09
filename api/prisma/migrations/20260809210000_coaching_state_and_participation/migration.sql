-- Participation dates. Without these the engine cannot tell "said nothing" from
-- "was not there", and reads a joiner as behind, a person on leave as quiet, and
-- keeps coaching somebody who has left. Nullable, so every existing row means
-- "present from the start, still here, never away", which is true of all of them.
ALTER TABLE "ground_participants" ADD COLUMN "joined_at" TIMESTAMP(3);
ALTER TABLE "ground_participants" ADD COLUMN "left_at" TIMESTAMP(3);

-- Authorized absence: DATES ONLY, shape [{ from, to }]. The reason is never
-- stored, inferred or surfaced. "On leave" is the entire fact the engine needs
-- and anything more is a liability.
ALTER TABLE "ground_participants" ADD COLUMN "leave_periods" JSONB;

-- What a person was last asked to do, and what happened to it. Private by
-- construction: one row per person per ground, never reaching a report, a board,
-- a lead, or a resolution.
CREATE TABLE "coaching_states" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "current_step" TEXT,
    "step_given_at" INTEGER,
    "staircase" TEXT,
    "staircase_position" INTEGER NOT NULL DEFAULT 0,
    "history" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "coaching_states_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "coaching_states_participant_id_key" ON "coaching_states"("participant_id");
ALTER TABLE "coaching_states" ADD CONSTRAINT "coaching_states_participant_id_fkey"
    FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Versioned targets. A goal change is a new chapter with a marked transition,
-- never an overwrite: effort toward the old goal stays real and banked wins stay
-- banked. Overwriting would make it impossible to avoid retro-reading the
-- pre-pivot period as failure against a bar that did not exist yet.
CREATE TABLE "ground_baselines" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "success_looks_like" TEXT,
    "conditions" JSONB,
    "change_reason" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ground_baselines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ground_baselines_ground_id_version_key" ON "ground_baselines"("ground_id", "version");
CREATE INDEX "ground_baselines_ground_id_idx" ON "ground_baselines"("ground_id");
ALTER TABLE "ground_baselines" ADD CONSTRAINT "ground_baselines_ground_id_fkey"
    FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
