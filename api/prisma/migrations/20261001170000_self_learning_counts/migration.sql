-- WEEK 8B, SELF-LEARNING (decisions 55 and 57, point 9). Counts only: no person, no name, no words.
-- One row per scope (an organisation's id, or ALL) and per pattern code, coaching step or probe source.
-- Nothing existing changes. Every column is new and empty.
ALTER TABLE "check_ins" ADD COLUMN "probe_sources" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "learning_signal_counts" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "judged" INTEGER NOT NULL DEFAULT 0,
    "good_count" INTEGER NOT NULL DEFAULT 0,
    "bad_count" INTEGER NOT NULL DEFAULT 0,
    "unsure_count" INTEGER NOT NULL DEFAULT 0,
    "answered_count" INTEGER NOT NULL DEFAULT 0,
    "talk_due" INTEGER NOT NULL DEFAULT 0,
    "talk_happened" INTEGER NOT NULL DEFAULT 0,
    "change_judged" INTEGER NOT NULL DEFAULT 0,
    "changed_count" INTEGER NOT NULL DEFAULT 0,
    "suggested_weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "weight_moved" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_signal_counts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "learning_signal_counts_scope_kind_key_key" ON "learning_signal_counts"("scope", "kind", "key");
CREATE INDEX "learning_signal_counts_kind_key_idx" ON "learning_signal_counts"("kind", "key");
