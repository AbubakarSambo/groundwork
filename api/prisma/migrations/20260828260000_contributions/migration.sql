-- Who is actually carrying the work, as against who the org chart says.
--
-- The two differ, and the difference is invisible to every tool in the customer's stack: theirs
-- knows who is assigned, and only the conversations know who is doing it.
--
-- WHAT THIS DELIBERATELY DOES NOT HOLD is who said it. A REFERENCED contribution means somebody
-- else described this person doing the work; storing which somebody would be attributed testimony
-- sitting in a table, one careless serialiser away from leaving the boundary. A count cannot be
-- turned back into a quote.

CREATE TYPE "ContributionKind" AS ENUM ('ASSIGNED', 'STATED', 'REFERENCED', 'UNBLOCKING');

CREATE TABLE "contributions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "subject_external_id" TEXT NOT NULL,
    "kind" "ContributionKind" NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "evidence" JSONB,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contributions_org_person_subject_kind_key"
    ON "contributions"("organization_id", "person_external_id", "subject_external_id", "kind");
CREATE INDEX "contributions_organization_id_subject_external_id_idx" ON "contributions"("organization_id", "subject_external_id");
CREATE INDEX "contributions_organization_id_person_external_id_idx" ON "contributions"("organization_id", "person_external_id");

ALTER TABLE "contributions" ADD CONSTRAINT "contributions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
