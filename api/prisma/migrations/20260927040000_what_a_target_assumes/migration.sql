-- WHAT A TARGET ASSUMES (U.7, B2 Context): the things a target rests on, one per line, written by
-- the lead. Empty for every existing target. Read by whoever may already read the target.
ALTER TABLE "ground_objectives" ADD COLUMN "assumes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
