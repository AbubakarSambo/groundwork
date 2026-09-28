-- The comparable fields every answer to a brief must hold: a named place, a quantity with its
-- period, which of a few named situations somebody is in. A subject is a topic to raise; a field is
-- the part of an answer that survives being counted. Read once from the brief and confirmed by the
-- lead, so every respondent is held to the same shape and the findings become arithmetic.
ALTER TABLE "grounds" ADD COLUMN "what_a_complete_answer_holds" JSONB;
