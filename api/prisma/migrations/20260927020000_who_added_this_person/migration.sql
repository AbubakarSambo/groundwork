-- WHO PUT THIS PERSON ON THE CHECK-IN (U.4). The door rule asks whether an admin of this
-- organisation added them. Null on every existing row, which keeps today's answer for them.
ALTER TABLE "ground_participants" ADD COLUMN "added_by_user_id" TEXT;
