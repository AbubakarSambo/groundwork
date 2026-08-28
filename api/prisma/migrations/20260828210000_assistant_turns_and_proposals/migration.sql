-- Panel turns, and actions offered but not yet taken.
--
-- Turns are how "never propose on the first turn" is answerable at all: a stateless endpoint cannot
-- know whether it has met somebody before, and offering to write something down within a second of
-- a stranger opening a panel is what makes people close it.
--
-- A proposal is DROPPED the moment the conversation moves on. If it could sit parked, a "yes" three
-- turns later meant for something else would fire it - a stale yes writing something somebody has
-- forgotten being asked about, which is worse than having no gate.

CREATE TABLE "assistant_turns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "lane" TEXT,
    "composed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_turns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assistant_turns_organization_id_person_external_id_created_at_idx"
    ON "assistant_turns"("organization_id", "person_external_id", "created_at");
ALTER TABLE "assistant_turns" ADD CONSTRAINT "assistant_turns_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "ProposalState" AS ENUM ('PARKED', 'ACCEPTED', 'DECLINED', 'DROPPED');

CREATE TABLE "assistant_proposals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "state" "ProposalState" NOT NULL DEFAULT 'PARKED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_commitment_id" TEXT,

    CONSTRAINT "assistant_proposals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assistant_proposals_organization_id_person_external_id_state_idx"
    ON "assistant_proposals"("organization_id", "person_external_id", "state");
ALTER TABLE "assistant_proposals" ADD CONSTRAINT "assistant_proposals_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
