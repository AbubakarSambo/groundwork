-- What the organisation has decided, as it stood at a point in time.
--
-- Versioned by supersession and never updated in place: a finding from March has to be explainable
-- by the handbook as it stood in March, and a card edited in place makes that impossible - the
-- evidence changes underneath the conclusion and nobody can tell it happened.
--
-- pg_trgm rather than pgvector. This deployment's Postgres has no vector extension, so retrieval is
-- trigram similarity plus a keyword pass, which genuinely matches "the vendor problem" to "vendor
-- comparison" without pretending to be an embedding. The embedding seam is documented as not built
-- rather than half-built.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "KnowledgeKind" AS ENUM (
  'OBJECTIVE','PRODUCT_MAP','ROLE_BRIEF','HANDBOOK','ONBOARDING_BRIEF',
  'COMMITMENT_NORM','BENCHMARK','PLAYBOOK','DOCUMENT','DECISION_RECORD','RESOURCE'
);

CREATE TABLE "knowledge_cards" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" "KnowledgeKind" NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source_ref" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "superseded_by_id" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "external_id" TEXT,
    "source_system" TEXT,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_cards_superseded_by_id_key" ON "knowledge_cards"("superseded_by_id");
CREATE INDEX "knowledge_cards_organization_id_kind_idx" ON "knowledge_cards"("organization_id", "kind");
CREATE INDEX "knowledge_cards_organization_id_key_effective_from_idx" ON "knowledge_cards"("organization_id", "key", "effective_from");

-- EXACTLY ONE LIVE VERSION PER KEY, enforced by the database rather than by remembering.
-- Supersession is two writes, and a crash between them would otherwise leave a key with two current
-- cards and no way to tell which one an answer came from.
CREATE UNIQUE INDEX "knowledge_cards_one_live_per_key"
    ON "knowledge_cards"("organization_id", "key") WHERE "effective_to" IS NULL;

-- Trigram indexes, so similarity search does not table-scan a customer's whole handbook.
CREATE INDEX "knowledge_cards_title_trgm" ON "knowledge_cards" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "knowledge_cards_body_trgm" ON "knowledge_cards" USING GIN ("body" gin_trgm_ops);

ALTER TABLE "knowledge_cards" ADD CONSTRAINT "knowledge_cards_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "knowledge_retrievals" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "cards" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_retrievals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "knowledge_retrievals_organization_id_created_at_idx" ON "knowledge_retrievals"("organization_id", "created_at");
ALTER TABLE "knowledge_retrievals" ADD CONSTRAINT "knowledge_retrievals_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
