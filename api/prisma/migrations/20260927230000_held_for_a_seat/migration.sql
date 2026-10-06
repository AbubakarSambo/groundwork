-- HELD FOR A SEAT (U.4 re-review): a guest added when the plan had no seat for them. False for
-- everybody else, which is every existing row.
ALTER TABLE "organization_memberships" ADD COLUMN "held_for_a_seat" BOOLEAN NOT NULL DEFAULT false;
