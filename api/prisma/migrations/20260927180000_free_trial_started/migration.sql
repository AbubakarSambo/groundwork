-- THE FREE TRIAL (U.19, F2). One new column, empty until billing grants an organisation the free
-- trial, which it does only while the trial setting is on (off by default). Nothing existing changes.
ALTER TABLE "organizations" ADD COLUMN "free_trial_started_at" TIMESTAMP(3);
