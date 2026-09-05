-- Why this number, and how it will be moved.
--
-- A key result was a target and a source. Neither says whether the target is the
-- right one, or whether anybody has thought about how to hit it — and a number
-- with no approach behind it is a wish with a deadline.
--
-- Two fields, not one: a good reason with no plan is a hope, and a good plan for
-- the wrong number is worse.
ALTER TABLE "ops_key_results" ADD COLUMN "justification" TEXT;
ALTER TABLE "ops_key_results" ADD COLUMN "approach" TEXT;
