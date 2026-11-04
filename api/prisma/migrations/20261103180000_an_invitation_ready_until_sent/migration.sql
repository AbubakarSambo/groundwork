-- Hafsah, 3 November 2026: the lead's invitations stay ready but unsent until they press "Send N invitations". When the lead held
-- an invitation that way. Null for every row written before this, which were never held.
ALTER TABLE "ground_participants" ADD COLUMN "invite_held_at" TIMESTAMP(3);
