-- ONE ROW PER PERSON PER KIND, not one row per person.
--
-- `person_objectives` allowed a single expectation per person for the product's whole life. That was
-- invisible while an expectation was one untyped sentence, and obviously wrong once they were typed:
-- a lead who says "Abubakar owes Hafsah the plan by Friday, and he owns escalations from now on" is
-- stating a commitment AND a standing role expectation, and the second overwrote the first.
--
-- Restating the same kind for the same person stays a revision and updates in place - which is what
-- keeps seen_by_subject honest when the words change. A different kind is a different thing.
--
-- Rows written before the primitive have kind NULL. Postgres treats NULLs as distinct in a unique
-- index, so those rows neither collide with each other nor block the new ones; the interview types
-- them the next time it asks.

DROP INDEX IF EXISTS "person_objectives_ground_id_participant_id_key";

CREATE UNIQUE INDEX "person_objectives_ground_id_participant_id_kind_key"
  ON "person_objectives" ("ground_id", "participant_id", "kind");

CREATE INDEX "person_objectives_ground_id_participant_id_idx"
  ON "person_objectives" ("ground_id", "participant_id");
