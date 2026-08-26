-- A note the whole team can read. Until now every context note was lead-only, so a lead who
-- wanted to tell the team the situation in words had no way to - only a file, which they then
-- had to remember to open. That absence is why the private note got misused.
--
-- Audience is visibility ONLY. It does not touch quotability: a shared note is still the lead's
-- words about a situation, so the report may use it to decide what to weigh and can never state
-- it as fact or attribute it to a party. Same rule as the private note; only the audience differs.
CREATE TYPE "ContextNoteAudience" AS ENUM ('LEAD_ONLY', 'EVERYONE');

-- Every existing row is lead-only, which is what it has always been. Nothing becomes visible to
-- anybody as a result of this migration.
ALTER TABLE "lead_context_notes"
  ADD COLUMN "audience" "ContextNoteAudience" NOT NULL DEFAULT 'LEAD_ONLY';
