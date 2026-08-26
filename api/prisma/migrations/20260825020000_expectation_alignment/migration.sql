-- GW-EXP-3: whether an expectation and the person's own idea of success connect.
-- Nullable: null means they have not said what success looks like to them yet, which is
-- reported as "not yet said" and never as agreement.
ALTER TABLE "person_objectives" ADD COLUMN "alignment" TEXT;
ALTER TABLE "person_objectives" ADD COLUMN "alignment_note" TEXT;
