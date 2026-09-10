-- THERE IS ONE WAY IN FROM WHATSAPP. The platform webhook now hands every message to the
-- organisation handler, working out which organisation the sender means and asking when a number is
-- on more than one roster. And a typed number is a menu pick only while the question is fresh, so
-- "7" in answer to "how many did you close?" is an answer, not a switch.
ALTER TABLE "whatsapp_threads" ALTER COLUMN "check_in_id" DROP NOT NULL;
ALTER TABLE "whatsapp_threads" ADD COLUMN "pick_pending_at" TIMESTAMP(3);
CREATE TABLE "whatsapp_organisation_picks" (
  "phone"           TEXT NOT NULL,
  "organization_id" TEXT,
  "pick_pending_at" TIMESTAMP(3),
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_organisation_picks_pkey" PRIMARY KEY ("phone")
);
