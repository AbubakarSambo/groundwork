-- Drop the cofounder intake columns.
--
-- Twelve free-text columns, each up to 4000 characters, holding a person's
-- founding/role/personal/exit intent, their compensation, autonomy, recognition,
-- growth and relationship asks, and their financial floor, stress tolerance and
-- relational tolerance.
--
-- They were written by PATCH /participants/:checkInId/intake, from a client
-- function no page ever called, and read by NOTHING - no report, no board, no
-- prompt. The only apparent reader was `hasIntake = !!founding_intent`, which was
-- returned to the client and consumed by nothing either. The whole subsystem was
-- reachable by no user and useful to no feature.
--
-- THIS IS DESTRUCTIVE AND INTENDED TO BE. Unused personal data of this kind is
-- not neutral: it is a standing liability in a product whose landing page makes
-- explicit promises about what happens to what people tell it. Keeping empty
-- columns "in case" preserves the liability and none of the value.
--
-- Any row that did somehow hold data loses it. That is the point of the change,
-- not a side effect of it: the engine already gathers this in conversation, where
-- it is probed, evidenced, and visible to the person in their own record.
ALTER TABLE "ground_participants"
  DROP COLUMN IF EXISTS "founding_intent",
  DROP COLUMN IF EXISTS "role_intent",
  DROP COLUMN IF EXISTS "personal_intent",
  DROP COLUMN IF EXISTS "exit_intent",
  DROP COLUMN IF EXISTS "compensation_ask",
  DROP COLUMN IF EXISTS "autonomy_ask",
  DROP COLUMN IF EXISTS "recognition_ask",
  DROP COLUMN IF EXISTS "growth_ask",
  DROP COLUMN IF EXISTS "relationship_ask",
  DROP COLUMN IF EXISTS "financial_floor",
  DROP COLUMN IF EXISTS "stress_tolerance",
  DROP COLUMN IF EXISTS "relational_tolerance";
