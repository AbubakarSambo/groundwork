-- A standing roadmap item is not a proposal.
--
-- Everything else on the roadmap can be argued with, reprioritised or dropped.
-- One or two cannot: they are the frame the others sit in, and showing them in
-- the same list with the same controls makes them look like opinions.
--
-- A standing item has no approval and no status somebody moves. Its definition
-- of done is computed, never typed.
ALTER TABLE "ops_roadmap_items" ADD COLUMN "standing" BOOLEAN NOT NULL DEFAULT false;
