-- The assistant panel goes in through the public API the way a customer's does,
-- so our ops server needs the two things a customer's server holds: the id of
-- the organisation its tokens claim, and the shared secret it signs them with.
--
-- Deliberately NOT the machine client credential already on this row. That opens
-- the data routes and belongs on a server; the panel runs in a browser, and a
-- machine secret in a browser is a machine secret in developer tools.
ALTER TABLE "ops_integration" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "ops_integration" ADD COLUMN "embed_secret" TEXT;
