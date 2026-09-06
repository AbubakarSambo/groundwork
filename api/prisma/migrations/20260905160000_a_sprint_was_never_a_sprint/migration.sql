-- "Change the name from sprint to special target companies or something close
-- to actually the point."
--
-- A sprint is engineering vocabulary for a two-week iteration, and this is not
-- one. It is a named, dated list of the companies we are trying to land, and
-- everybody who met the word read it as the other thing.
--
-- Both renames, no data movement: the rows and their values are untouched.
ALTER TYPE "OpsPeriodKind" RENAME VALUE 'SPRINT' TO 'TARGET_LIST';
ALTER TABLE "ops_companies" RENAME COLUMN "sprint_period_id" TO "target_list_id";
ALTER INDEX IF EXISTS "ops_companies_sprint_period_id_idx" RENAME TO "ops_companies_target_list_id_idx";
