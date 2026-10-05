-- Every free run is one month (Hafsah, 5 October 2026; decision 78). The staff gift used to default to three.
-- Only the default changes: a free run already promised or running keeps the length it was given.
ALTER TABLE "free_runs" ALTER COLUMN "months" SET DEFAULT 1;
