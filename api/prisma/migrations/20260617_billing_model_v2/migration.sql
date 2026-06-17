-- Rename SCENARIO_FEE → PARTICIPANT_FEE in the BillingEventType enum.
-- Postgres supports renaming enum values in-place since 10; no data migration needed.
ALTER TYPE "BillingEventType" RENAME VALUE 'SCENARIO_FEE' TO 'PARTICIPANT_FEE';
