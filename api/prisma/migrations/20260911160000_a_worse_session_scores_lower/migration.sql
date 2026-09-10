-- A WORSE SESSION SCORES LOWER. The mapper put the lowest score into "managed" and the report ranked
-- "managed" above "directional", so a person who said almost nothing outranked one who gave a
-- directional answer. The order lives in code now; the database enumerates the column so nothing
-- else can be written into it. And "not scored yet" is told apart from "the scorer failed".
ALTER TABLE "check_ins" ADD COLUMN "specificity_scored_at" TIMESTAMP(3);

-- Every completed session that carries a level was scored when it completed.
UPDATE "check_ins" SET "specificity_scored_at" = "completed_at"
WHERE "specificity_level" IS NOT NULL AND "specificity_scored_at" IS NULL;

-- recall_confidence was the specificity number under a second name. Cleared, so nothing reads a
-- corroboration that never existed; the column itself goes with the other dead columns.
UPDATE "check_ins" SET "recall_confidence" = NULL WHERE "recall_confidence" IS NOT NULL;

ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_specificity_level_is_one_of_four"
  CHECK ("specificity_level" IS NULL OR "specificity_level" IN ('managed', 'vague', 'directional', 'specific'));
