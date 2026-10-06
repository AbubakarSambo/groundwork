-- HOW THEY JOINED (U.3 review). One new empty column, so the sidebar can say why somebody is in an
-- organisation ("domain" or "link"). Existing rows stay empty, and then no reason is given.
ALTER TABLE "organization_memberships" ADD COLUMN "joined_how" VARCHAR(20);
