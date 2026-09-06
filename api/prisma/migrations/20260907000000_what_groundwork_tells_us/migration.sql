-- WHAT GROUNDWORK TOLD US, RECEIVED THE WAY A CUSTOMER RECEIVES IT.
--
-- Our back office has only ever sent. It subscribed to nothing, so a commitment
-- made in a check-in never reached the board somebody is measured on. Half of
-- being a customer is receiving, and it is the half that flatters us less.
CREATE TABLE "ops_groundwork_events" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "verified" BOOLEAN NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acted_on" TEXT,

  CONSTRAINT "ops_groundwork_events_pkey" PRIMARY KEY ("id")
);

-- The same event arriving twice is one row. Retries are normal and a duplicate
-- must not become a second fact.
CREATE UNIQUE INDEX "ops_groundwork_events_event_id_key" ON "ops_groundwork_events"("event_id");
CREATE INDEX "ops_groundwork_events_kind_received_at_idx" ON "ops_groundwork_events"("kind", "received_at");
