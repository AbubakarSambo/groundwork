-- A PERSON MAY HAVE A DEPARTMENT, AND MAY NOT. Department is captured beside the role at every door
-- that adds a person: the directory sync already wrote it on Person; the add-a-contributor door and
-- the join page write a GroundParticipant, which had nowhere to put it. Optional, never inferred,
-- blank means blank. No backfill: blank is a valid answer.
ALTER TABLE "ground_participants" ADD COLUMN "department" VARCHAR(120);
ALTER TABLE "pending_joins" ADD COLUMN "department" VARCHAR(120);
