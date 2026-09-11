-- WHAT AN ACCOUNT SHOWS, MADE ONCE AND KEPT. GET /grounds/:id/conversation returned every
-- participant's raw turns to the lead. It returns a read of each completed account against what the
-- check-in asks instead - derived, never their words, never evidence - and a read is generated once
-- per account and kept here, so two readings of the same record never disagree.
CREATE TABLE "what_an_account_shows" (
  "id"             TEXT NOT NULL,
  "check_in_id"    TEXT NOT NULL,
  "ground_id"      TEXT NOT NULL,
  "participant_id" TEXT NOT NULL,
  "source_hash"    TEXT NOT NULL,
  "text"           TEXT NOT NULL,
  "withheld"       INTEGER NOT NULL DEFAULT 0,
  "derived"        BOOLEAN NOT NULL DEFAULT true,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "what_an_account_shows_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "what_an_account_shows_check_in_id_source_hash_key" ON "what_an_account_shows"("check_in_id", "source_hash");
CREATE INDEX "what_an_account_shows_ground_id_idx" ON "what_an_account_shows"("ground_id");
