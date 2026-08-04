-- Sign-off + post-sign-off correction flag (Honest Corrections design).
-- GroundParticipant.signedOffAt: explicit "my account is accurate" confirmation.
-- CheckIn.isPostSignOff: stamped when a self-correction session starts after
-- the participant already signed off, so the shared report can flag it.

ALTER TABLE "ground_participants" ADD COLUMN "signed_off_at" TIMESTAMP(3);

ALTER TABLE "check_ins" ADD COLUMN "is_post_sign_off" BOOLEAN NOT NULL DEFAULT false;
