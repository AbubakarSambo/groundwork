-- THE ROLE MAP (U.17, E6). Two new tables, empty until the engine writes them: each person's answers to
-- the role interview, and why a job nobody owns matters. Nothing existing is altered.
CREATE TABLE "role_interview_answers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_external_id" TEXT NOT NULL,
    "role_name" VARCHAR(200) NOT NULL,
    "owns" TEXT,
    "decides" TEXT,
    "depends_on" TEXT,
    "depended_on_by" TEXT,
    "prompt_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_interview_answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_gap_notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role_name" VARCHAR(200) NOT NULL,
    "says" TEXT NOT NULL,
    "prompt_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_gap_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "role_interview_answers_organization_id_role_name_idx" ON "role_interview_answers"("organization_id", "role_name");

CREATE INDEX "role_gap_notes_organization_id_role_name_idx" ON "role_gap_notes"("organization_id", "role_name");

ALTER TABLE "role_interview_answers" ADD CONSTRAINT "role_interview_answers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_gap_notes" ADD CONSTRAINT "role_gap_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

