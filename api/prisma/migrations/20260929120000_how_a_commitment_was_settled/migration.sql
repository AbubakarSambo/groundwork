-- Week 9: how a commitment was settled - SAID (their own word), PROVEN (their own document) or CONFIRMED (the colleague who received it). Adds one nullable column; changes no data.
ALTER TABLE "ground_commitments" ADD COLUMN "settled_by" TEXT;
