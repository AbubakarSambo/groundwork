-- F2, 2 November 2026: whether a wait was taken above the person it was with, or round them, is the assessment's reading of
-- the person's words, kept on the wait. Null where it was never read (every row written before this).
ALTER TABLE "ground_dependencies" ADD COLUMN "taken_further" BOOLEAN;
