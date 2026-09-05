-- A DRAFT CARRIED A MEASURE AND A TARGET, AND NEITHER SAYS WHY OR HOW.
--
-- A draft could reach the seed gate having agreed a number that nobody argued
-- for and nobody had a plan to move. The gate checked that people AGREED, which
-- is a different thing from the objective being any good — six people can agree
-- on a number none of them can explain.
--
-- Kept apart on purpose. The justification is why this number is the one that
-- matters; the approach is what somebody is actually going to do. They fail
-- differently: a good reason with no plan is a hope, and a good plan for the
-- wrong number is worse, because it works.
ALTER TABLE "objective_drafts" ADD COLUMN "proposed_justification" TEXT;
ALTER TABLE "objective_drafts" ADD COLUMN "proposed_approach" TEXT;
