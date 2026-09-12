-- The one line a round found, which is what sits at the top of its report.
-- Nullable: every round kept before now has none, and a round may produce none.
ALTER TABLE "report_rounds" ADD COLUMN "finding" TEXT;
