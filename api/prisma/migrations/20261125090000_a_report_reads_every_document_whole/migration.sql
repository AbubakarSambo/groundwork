-- A report on request reads every document whole (the documents test of 24 November 2026).
ALTER TABLE "report_materials" ADD COLUMN "bytes" BYTEA;
ALTER TABLE "report_materials" ADD COLUMN "mime_type" TEXT;
ALTER TABLE "report_materials" ADD COLUMN "reading" JSONB;
ALTER TABLE "report_materials" ADD COLUMN "read_at" TIMESTAMP(3);
ALTER TABLE "reports_on_request" ADD COLUMN "written" JSONB;
