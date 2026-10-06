-- THE REASON FOR A DECISION (U.11, B6 Ending a check-in): why the lead chose the outcome, in their
-- own words. Empty for every check-in that ended before this. Read with the outcome by the people in
-- the check-in and by an admin, through the resolution read only.
ALTER TABLE "resolutions" ADD COLUMN "reason" TEXT;
