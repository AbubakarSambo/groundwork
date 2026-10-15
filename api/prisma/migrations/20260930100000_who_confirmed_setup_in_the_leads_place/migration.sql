-- DECISION 63 (30 September 2026): ONLY THE LEAD CONFIRMS SETUP CHANGES AND QUESTIONS FOR PEOPLE,
-- UNLESS THE LEAD HAS LEFT THE ORGANISATION - THEN AN ADMIN CAN, AND PEOPLE ARE TOLD WHO DID IT.
--
-- Each column holds the plain sentence itself (see who-may-confirm-setup.ts,
-- confirmedByAnAdminSentence), set only when an admin confirmed in the lead's place; null whenever
-- the lead confirmed it themselves, which is unchanged and needs no new record.
ALTER TABLE "ground_context_items" ADD COLUMN "confirmed_by_admin_note" TEXT;
ALTER TABLE "lead_context_notes" ADD COLUMN "confirmed_by_admin_note" TEXT;
ALTER TABLE "ground_baselines" ADD COLUMN "confirmed_by_admin_note" TEXT;
