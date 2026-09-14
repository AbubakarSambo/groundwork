-- WHAT WAS ACTUALLY TRIED, IN THEIR OWN WORDS.
--
-- The record knew who was waiting on whom and what for, and never whether anybody had tried. Live:
-- "I emailed finance twice, no answer" - three weeks, two emails, indistinguishable in the record
-- from somebody who had called, escalated and been refused. Null means nobody has said, which is
-- true of every row that exists today.
ALTER TABLE "ground_dependencies" ADD COLUMN "tried_said" TEXT;
