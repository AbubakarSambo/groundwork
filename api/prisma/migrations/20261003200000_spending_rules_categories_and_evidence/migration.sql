-- THE SPENDING RULES: A CATEGORY AND THE EVIDENCE NEEDED, ON EACH REQUEST TO SPEND (decision 85, build step 9).
--
-- An admin can now name categories (fuel, travel, or the organisation's projects) and say when a
-- receipt or a quote is needed. Each request to spend keeps the category it is for and which evidence
-- the rules asked for when it was asked: only that it is needed, never a file. The rules themselves are
-- kept in an existing table (`organization_suites`, the `spendRules` row). Two new columns, empty on
-- every request already kept; nothing existing is changed.

-- AlterTable
ALTER TABLE "spend_requests" ADD COLUMN     "category" VARCHAR(40),
ADD COLUMN     "evidence_needed" TEXT[] DEFAULT ARRAY[]::TEXT[];
