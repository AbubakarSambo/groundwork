-- A write to the record is owed until it lands (1 November 2026): a failed model write is kept on its check-in and tried again.
ALTER TABLE "check_ins" ADD COLUMN "writes_owed" JSONB;
