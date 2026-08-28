-- Searching somebody's own past turns.
--
-- Same trigram approach as knowledge cards, for the same reason: no vector extension here, and
-- "the vendor problem" has to find "the vendor comparison" without pretending to be an embedding.
--
-- The index is on content alone. Every query that uses it is additionally scoped by organisation
-- AND person - a recall that could reach another participant's turns is the failure this product
-- exists to prevent, and the scoping is in the query rather than in the index.

CREATE INDEX "assistant_turns_content_trgm" ON "assistant_turns" USING GIN ("content" gin_trgm_ops);
