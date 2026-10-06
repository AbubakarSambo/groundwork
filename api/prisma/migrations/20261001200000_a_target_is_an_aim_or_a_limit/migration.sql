-- DECISION 69, 1 October 2026. Each target says whether it is an aim to reach or a limit not to go over,
-- as the lead confirmed it. Null means not set, which is every row that exists today: those keep the
-- board's word-based guess until the lead sets one. Nothing existing is changed or guessed at here.
CREATE TYPE "TargetDirection" AS ENUM ('AIM', 'LIMIT');

ALTER TABLE "ground_objectives" ADD COLUMN "direction" "TargetDirection";
