-- THE OPENING, KEPT ON ITS OWN.
--
-- The board's summary was the first three sentences of the report's shared picture, sliced out of
-- the prose. That made every board lead with the report's glued opening. The opening is now written
-- once as plain sentences and kept here, so the board reads a sentence rather than guessing where
-- one ends.
ALTER TABLE "reports" ADD COLUMN "the_opening" TEXT;
