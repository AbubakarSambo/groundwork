-- Decision 46 (29 September 2026): the lead says plainly when a target is a decision about a person,
-- set by the lead when the target is made, never guessed from its wording. Adds one nullable-default
-- boolean column; changes no data. Every existing row reads false, which is correct: nothing here
-- guesses at rows that already existed either.
ALTER TABLE "ground_objectives" ADD COLUMN "is_a_decision_about_a_person" BOOLEAN NOT NULL DEFAULT false;
