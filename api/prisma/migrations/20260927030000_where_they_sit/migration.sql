-- WHERE THEY SIT (U.4): each person's level, team and who they report to, per organisation. They
-- describe the organisation and grant nothing. Null for everybody until an admin sets them.
ALTER TABLE "organization_memberships" ADD COLUMN "level" VARCHAR(120);
ALTER TABLE "organization_memberships" ADD COLUMN "team" VARCHAR(120);
ALTER TABLE "organization_memberships" ADD COLUMN "reports_to_user_id" TEXT;
