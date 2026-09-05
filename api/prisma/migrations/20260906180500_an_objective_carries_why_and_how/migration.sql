-- The reason a target exists is the first thing to go missing, and it is needed
-- most in the check-in where the target is being missed. Carried on the
-- objective rather than left behind in the draft that agreed it.
--
-- Nullable: an objective imported from a customer's own system arrives with
-- whatever that system holds, and refusing an import for a missing sentence
-- would mean refusing their data. Drafts agreed in here are refused without both.
ALTER TABLE "subjects" ADD COLUMN "justification" TEXT;
ALTER TABLE "subjects" ADD COLUMN "approach" TEXT;
