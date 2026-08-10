-- Who a document is for.
--
-- Until now every document was private to whoever uploaded it, because
-- documents.list filtered on participantId. That was a participant guard applied
-- to a list query rather than a decision, and it is right for one of the three
-- real cases and backwards for another: the lead's brief, plan or grant terms
-- reach nobody, and those are the things everybody should be working from.
--
-- OWN is the default so every existing row keeps behaving exactly as it does,
-- which is what lets CONTEXT_ENABLED off be the old product rather than a
-- degraded one. Additive only: a new type and a new column with a default. No
-- existing column changes meaning, so turning the flag off restores everything.

CREATE TYPE "DocumentVisibility" AS ENUM ('OPEN', 'CLOSED', 'OWN');

ALTER TABLE "ground_documents"
  ADD COLUMN "visibility" "DocumentVisibility" NOT NULL DEFAULT 'OWN';
