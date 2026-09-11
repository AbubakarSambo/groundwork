-- AN INVITATION IS A STANDING OFFER, AND NOBODY LOSES ONE QUIETLY. Two stamps for the daily sweep:
-- the invitee is warned two days before their link lapses, and the lead is told once it has.
ALTER TABLE "ground_participants" ADD COLUMN "invite_expiry_warned_at" TIMESTAMP(3);
ALTER TABLE "ground_participants" ADD COLUMN "invite_lapsed_told_at" TIMESTAMP(3);
