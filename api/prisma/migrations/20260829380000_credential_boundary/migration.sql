-- WHOSE WORK A CREDENTIAL MAY SEE.
--
-- Scopes said what a token may DO and nothing about whom to, so a credential that could read findings
-- read every finding in the organisation - and a sales integration and an engineering one were the
-- same integration with different names.
--
-- Empty is the whole organisation: what every existing credential means today, and what a
-- single-team customer wants. The default keeps every issued credential behaving exactly as it does.
ALTER TABLE "api_credentials"
  ADD COLUMN "bound_to_person_external_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
