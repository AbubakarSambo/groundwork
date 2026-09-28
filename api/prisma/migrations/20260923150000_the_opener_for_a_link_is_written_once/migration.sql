-- The first thing the product says to somebody who arrived through the open link, written once.
-- An opener is composed from the brief and the scenario and nothing else, so a hundred people
-- through one link were each waiting for the same sentence to be written again.
ALTER TABLE "grounds" ADD COLUMN "opener_for_a_link" TEXT;
