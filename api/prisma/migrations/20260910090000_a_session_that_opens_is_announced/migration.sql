-- A session that becomes open to somebody is announced once to the organisation's webhooks.
ALTER TABLE "check_ins" ADD COLUMN "opened_announced_at" TIMESTAMP(3);
