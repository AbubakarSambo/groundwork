-- ONE RECORD OF WHO DID WHAT ON A SUITE (decision 85, build step 5).
--
-- Two new tables, both empty. suite_events keeps, for every leave request, request to spend, week of
-- hours and review, who asked, who was told, who approved each step, who declined, who it was passed
-- to, and who started and decided a review, each with when and a reference to the rows it was about
-- (never a copy of anybody's words). suite_rule_changes keeps each change of a suite's rules, who holds
-- each duty, and the approval steps, with who changed it, when, and from what to what, because
-- organization_suites keeps only the last. Nothing existing is changed.

CREATE TABLE "suite_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "suite" VARCHAR(16) NOT NULL,
    "ref" VARCHAR(200) NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "by_user_id" TEXT,
    "to_user_id" TEXT,
    "step" INTEGER,
    "basis" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suite_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suite_rule_changes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "suite" VARCHAR(24) NOT NULL,
    "changed_by_id" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "before" JSONB,
    "after" JSONB NOT NULL,

    CONSTRAINT "suite_rule_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "suite_events_organization_id_suite_ref_at_idx" ON "suite_events"("organization_id", "suite", "ref", "at");

CREATE INDEX "suite_rule_changes_organization_id_changed_at_idx" ON "suite_rule_changes"("organization_id", "changed_at");

ALTER TABLE "suite_events" ADD CONSTRAINT "suite_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "suite_rule_changes" ADD CONSTRAINT "suite_rule_changes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
