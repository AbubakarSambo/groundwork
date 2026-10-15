-- REQUEST 37: A CHECK-IN THAT RUNS UNTIL THE LEAD ENDS IT.
-- Existing check-ins keep a planned length, so the column defaults to false.
ALTER TABLE "grounds" ADD COLUMN "runs_until_ended" BOOLEAN NOT NULL DEFAULT false;
