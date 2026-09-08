-- Somebody added to a check-in when the account is full: the row exists so the lead can see them
-- and see that they are waiting, and nothing is emailed until an admin makes room. Adding used to
-- be refused outright, which stops the lead's work for a reason only somebody else can fix.
ALTER TABLE "ground_participants" ADD COLUMN "awaiting_seat" BOOLEAN NOT NULL DEFAULT false;
