-- How many people had answered when this report was written.
--
-- Ten agribusinesses answered one open link over ten minutes. The report the lead read said "2 of 2
-- people have given an account" and its table said "4 people answered this check-in", because the
-- last synthesis that SUCCEEDED ran when four answers were on record - two later ones failed to
-- parse and one was refused by a guard, and a failed synthesis correctly keeps the report that is
-- already there. Correctly, and silently: nothing on the page said the numbers were older than the
-- answers, and nothing ever went back for the six who came after.
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "built_from_answers" INTEGER;
