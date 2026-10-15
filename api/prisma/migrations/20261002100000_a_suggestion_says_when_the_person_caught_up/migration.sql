-- DECISION 75, ITEM 24, 2 October 2026. A suggestion nobody has decided keeps its original facts, but if the
-- person is back at or above the threshold before anyone decides, every reader of it is told they have caught
-- up since, with the date. Null means they have not, which is every row that exists today. Nothing existing is
-- changed or guessed at here; the mark is written when something new comes in.
ALTER TABLE "suggestions" ADD COLUMN "caught_up_at" TIMESTAMP(3);
