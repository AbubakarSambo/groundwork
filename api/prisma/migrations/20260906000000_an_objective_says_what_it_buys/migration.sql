-- An objective says what it buys, and what it is instead of.
--
-- The form asked for a title, an area and a sentence — a note rather than an
-- objective. `serves` uses the same four values a piece of work can serve, so
-- an objective and the work under it answer one question in one vocabulary.
--
-- `instead` is the conveyor belt: "why is this the best use of time" is
-- unanswerable in the abstract and only answerable against the alternative.
--
-- The sales arithmetic is kept as its two parts rather than the product, so the
-- claim can be checked against the pipeline rather than only admired.
ALTER TABLE "ops_objectives" ADD COLUMN "serves" "OpsServes";
ALTER TABLE "ops_objectives" ADD COLUMN "justification" TEXT;
ALTER TABLE "ops_objectives" ADD COLUMN "instead" TEXT;
ALTER TABLE "ops_objectives" ADD COLUMN "companies_expected" INTEGER;
ALTER TABLE "ops_objectives" ADD COLUMN "value_per_company_cents" INTEGER;
