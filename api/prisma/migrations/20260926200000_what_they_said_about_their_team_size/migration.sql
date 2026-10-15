-- WHAT THE PERSON WHO CREATED AN ORGANISATION SAID ABOUT ITS SIZE (U.3).
--
-- "Create an organisation" asks "How many people will use it?" while the free trial is on. The
-- answer is kept beside the team size they were shown, so billing can grant the trial from it
-- later (U.19) rather than ask again. Both empty for every organisation made before this.
ALTER TABLE "organizations" ADD COLUMN "team_size_said" TEXT;
ALTER TABLE "organizations" ADD COLUMN "team_size_line" INTEGER;
