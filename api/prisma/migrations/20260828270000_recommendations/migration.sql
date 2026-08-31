-- Work an objective needs that nobody has picked up.
--
-- The turn from a tool that observes work into one that generates it, and the line it must not
-- cross is doing so silently. It proposes; a person accepts; the acceptance is recorded.
--
-- Every recommendation carries the gap it closes. One a person cannot interrogate is one they
-- either take on faith or ignore, and both are worse than not making it.

CREATE TYPE "RecommendationState" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED', 'EXPIRED');

CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject_external_id" TEXT,
    "person_external_id" TEXT,
    "body" TEXT NOT NULL,
    "rationale" JSONB NOT NULL,
    "source_detector_ids" TEXT[],
    "state" "RecommendationState" NOT NULL DEFAULT 'PROPOSED',
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_external_id" TEXT,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recommendations_organization_id_state_idx" ON "recommendations"("organization_id", "state");
CREATE INDEX "recommendations_organization_id_subject_external_id_idx" ON "recommendations"("organization_id", "subject_external_id");

ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
