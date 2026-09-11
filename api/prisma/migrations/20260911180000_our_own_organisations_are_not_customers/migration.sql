-- OUR OWN ORGANISATIONS ARE NOT CUSTOMERS. The platform panel counted every organisation, ours
-- included, and every session, setup conversations included. This flag marks ours; it is set by
-- hand after the migration, and every platform count excludes what it marks.
ALTER TABLE "organizations" ADD COLUMN "is_internal" BOOLEAN NOT NULL DEFAULT false;
