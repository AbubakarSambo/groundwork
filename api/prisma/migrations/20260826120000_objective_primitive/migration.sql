-- THE OBJECTIVE PRIMITIVE. What kind of thing this is, how we would know it happened, and by when.
--
-- Teams track different shapes - to-dos, commitments, targets, goals, a definition of success, a
-- standing role expectation, a ticket settled elsewhere. Holding them all as one untyped sentence
-- is why a session cannot press on any of them properly.
--
-- ADDITIVE AND NULLABLE. Every row that already exists was written before any of this and none of
-- them are wrong - they are untyped, not incorrect. Nothing is back-filled by guessing: the
-- interview fills a row in when it next asks about it.
--
-- `check = NOT_CHECKABLE` is a real value, not a missing one. It is what lets the interview ask
-- "how would we know?" and what stops an unmeasurable sentence looking like a failed target.

CREATE TYPE "ObjectiveKind"  AS ENUM ('TODO','COMMITMENT','TARGET','GOAL','SUCCESS_DEFINITION','ROLE_EXPECTATION','REFERENCE');
CREATE TYPE "ObjectiveCheck" AS ENUM ('DONE_OR_NOT','A_NUMBER','A_JUDGEMENT','NOT_CHECKABLE');
CREATE TYPE "ObjectiveDue"   AS ENUM ('A_DATE','A_CYCLE','STANDING','NOT_SAID');
CREATE TYPE "ObjectiveScope" AS ENUM ('ONE_PERSON','EVERYONE_IN_ROLE','WHOLE_CHECK_IN');

ALTER TABLE "person_objectives"
  ADD COLUMN "kind"      "ObjectiveKind",
  ADD COLUMN "check"     "ObjectiveCheck",
  ADD COLUMN "due_kind"  "ObjectiveDue",
  ADD COLUMN "due_said"  TEXT,
  ADD COLUMN "scope"     "ObjectiveScope" NOT NULL DEFAULT 'ONE_PERSON',
  ADD COLUMN "owed_to_participant_id" TEXT;
