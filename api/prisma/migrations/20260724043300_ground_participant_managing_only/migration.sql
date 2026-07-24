-- Lead can choose "managing only" at confirm-lead: they oversee the ground but
-- never give their own account. Excluded from readiness counting.
ALTER TABLE "ground_participants" ADD COLUMN "managing_only" BOOLEAN NOT NULL DEFAULT false;
