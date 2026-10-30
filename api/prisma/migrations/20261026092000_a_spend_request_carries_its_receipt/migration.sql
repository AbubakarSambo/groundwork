-- What the person attached to a request to spend: a receipt or a proforma. Its name, which it is, and its words. Add-only.
ALTER TABLE "spend_requests" ADD COLUMN IF NOT EXISTS "attached_name" VARCHAR(200);
ALTER TABLE "spend_requests" ADD COLUMN IF NOT EXISTS "attached_kind" VARCHAR(16);
ALTER TABLE "spend_requests" ADD COLUMN IF NOT EXISTS "attached_text" TEXT;
