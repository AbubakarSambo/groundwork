-- Somebody can belong to more than one organisation.
--
-- User.email is globally unique, so one address is one row, and that is why there was
-- no way to be in two organisations at once. Membership becomes its own table and
-- users.organization_id becomes the ACTIVE one - the org the token scopes queries to.
-- Every org-scoped query already reads it off the token, so switching means issuing a
-- new token rather than rewriting the queries.
CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_memberships_user_id_organization_id_key"
    ON "organization_memberships"("user_id", "organization_id");
CREATE INDEX "organization_memberships_user_id_idx" ON "organization_memberships"("user_id");

ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BACKFILL, and it has to be complete before anything reads this table.
--
-- Every existing user is a member of the org they are already in, with the role they
-- already have. Without this, the switcher would show nobody any organisations - not
-- even their own - and "my organisations" would be empty for the entire user base.
INSERT INTO "organization_memberships" ("id", "user_id", "organization_id", "role", "created_at")
SELECT gen_random_uuid(), u."id", u."organization_id", u."role", COALESCE(u."created_at", CURRENT_TIMESTAMP)
FROM "users" u
ON CONFLICT ("user_id", "organization_id") DO NOTHING;
