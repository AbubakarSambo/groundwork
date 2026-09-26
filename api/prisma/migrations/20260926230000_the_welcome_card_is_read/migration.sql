-- THE NEW ADMIN'S WELCOME CARD (U.3). When the person pressed "Got it", so the card stays gone on
-- every device. Null for everybody until they do.
ALTER TABLE "users" ADD COLUMN "welcome_card_seen_at" TIMESTAMP(3);
