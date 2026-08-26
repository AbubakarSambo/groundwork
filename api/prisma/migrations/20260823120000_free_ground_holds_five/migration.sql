-- A free ground holds five people, which is what the pricing page sells.
--
-- The column defaulted to 4 while DEFAULT_FREE_MEMBER_LIMIT was 5, so a free user's very first
-- check-in refused the fifth person they had just been promised, and the refusal quoted the wrong
-- number while doing it. The call sites were corrected and this default was not, so any path that did
-- not pass the cap explicitly kept producing 4.
ALTER TABLE "grounds" ALTER COLUMN "free_participant_cap" SET DEFAULT 5;

-- And the rows that already hold the old default. Fixing the default helps nobody who already has a
-- ground, and this is the half that reaches people.
--
-- SCOPED TO EXACTLY 4, deliberately:
--   * broadcast grounds carry 100 and must not be touched;
--   * a lead who deliberately passed a smaller cap through the DTO keeps it;
--   * 4 is the old default, so this is the population that never chose its own number.
--
-- A lead who deliberately chose exactly 4 is raised to 5. That only ever permits more people: no
-- ground loses capacity from this, and nobody already in one is affected.
UPDATE "grounds" SET "free_participant_cap" = 5 WHERE "free_participant_cap" = 4;
