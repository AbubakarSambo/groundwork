-- What a turn asked of somebody, stamped at write time so the balance between two parties can be
-- counted without ever reading one person's turns while answering another. An AI turn carries the
-- person's own words reflected back, so loading them across check-ins would be loading their
-- account into somebody else's session.
ALTER TABLE "conversation_turns" ADD COLUMN "asked_for" TEXT;
