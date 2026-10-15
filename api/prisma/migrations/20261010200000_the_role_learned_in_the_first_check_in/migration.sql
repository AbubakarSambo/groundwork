-- The role interview moves into a person's first check-in (decision 129). Six empty columns on role_interview_answers.
-- Every column has IF NOT EXISTS so this can be run again. No existing row changes: the rows already kept are the
-- ones an admin sent and the person agreed to, which the default 'interview' says, and the role map goes on reading them.
ALTER TABLE "role_interview_answers" ADD COLUMN IF NOT EXISTS "doing_well" TEXT;
ALTER TABLE "role_interview_answers" ADD COLUMN IF NOT EXISTS "in_the_way" TEXT;
ALTER TABLE "role_interview_answers" ADD COLUMN IF NOT EXISTS "source" VARCHAR(40) NOT NULL DEFAULT 'interview';
ALTER TABLE "role_interview_answers" ADD COLUMN IF NOT EXISTS "shared_at" TIMESTAMP(3);
ALTER TABLE "role_interview_answers" ADD COLUMN IF NOT EXISTS "check_in_id" TEXT;
ALTER TABLE "role_interview_answers" ADD COLUMN IF NOT EXISTS "asked_with_prompt_version_id" TEXT;
CREATE INDEX IF NOT EXISTS "role_interview_answers_organization_id_person_external_id_idx" ON "role_interview_answers"("organization_id", "person_external_id");
