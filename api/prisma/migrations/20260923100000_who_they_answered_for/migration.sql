-- WHO THEY ANSWERED FOR, WHICH THE OPEN LINK NEVER ASKED.
--
-- A hundred people from a hundred different organisations answer one link, give a name and an
-- address, and the record could not say which organisation any of it was about. On a check-in whose
-- whole question is "where should we expand and for whom", the organisation is not a nicety - it is
-- the unit the report is about.
--
-- Nullable, like `name_given`: somebody who does not say is still on the record.
ALTER TABLE "ground_participants" ADD COLUMN "organisation_given" VARCHAR(160);
