-- Each answer put into the fields a complete answer holds, so a hundred conversations become a
-- hundred rows that can be counted; and the judgement written over the table of those counts.
ALTER TABLE "check_ins" ADD COLUMN "their_answer_fitted" JSONB;
ALTER TABLE "reports" ADD COLUMN "the_judgement" JSONB;
ALTER TABLE "reports" ADD COLUMN "the_table" TEXT;
