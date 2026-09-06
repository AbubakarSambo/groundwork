-- THE FIVE PHASES OF THE WORKPLAN, WHICH OVERLAP.
--
-- Its own table rather than a kind of period: a period has one set of dates and
-- only one is current, and two phases are routinely running at once.
CREATE TABLE "ops_phases" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE NOT NULL,
  "exit_condition" TEXT NOT NULL,
  "exit_metric" TEXT,
  "exit_target" DECIMAL(14,2),
  "permits_operability" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "ops_phases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ops_phases_key_key" ON "ops_phases"("key");
CREATE INDEX "ops_phases_ordinal_idx" ON "ops_phases"("ordinal");

-- The fifth thing a piece of work can serve. Bounded by the phase that makes it
-- legitimate; the rule lives in the service, where a refusal can be a sentence.
ALTER TYPE "OpsServes" ADD VALUE 'MAKES_THE_COMPANY_OPERABLE';
