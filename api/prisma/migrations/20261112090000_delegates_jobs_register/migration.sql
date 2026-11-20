-- A person who acts for a senior person, two standing jobs, and what the outstanding register keeps. Additive only.
CREATE TABLE "delegates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "delegate_email" TEXT NOT NULL,
    "delegate_name" TEXT NOT NULL,
    "delegate_user_id" TEXT,
    "created_via" TEXT NOT NULL DEFAULT 'chat',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_via" TEXT,
    CONSTRAINT "delegates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "delegates_organization_id_principal_user_id_idx" ON "delegates"("organization_id", "principal_user_id");
CREATE INDEX "delegates_delegate_email_idx" ON "delegates"("delegate_email");

CREATE TABLE "delegate_actions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "delegate_id" TEXT NOT NULL,
    "delegate_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delegate_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "delegate_actions_organization_id_principal_user_id_created_at_idx" ON "delegate_actions"("organization_id", "principal_user_id", "created_at");

CREATE TABLE "persistent_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'collecting',
    "next_action" TEXT,
    "authorised_actor_user_id" TEXT,
    "deadline" DATE,
    "last_meaningful_contact_at" TIMESTAMP(3),
    "coverage" JSONB NOT NULL DEFAULT '{}',
    "last_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "persistent_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "persistent_jobs_organization_id_principal_user_id_kind_key" ON "persistent_jobs"("organization_id", "principal_user_id", "kind");

CREATE TABLE "register_notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "source_kind" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "register_key" TEXT,
    "due_on" DATE,
    "awaiting" TEXT,
    "decision_question" TEXT,
    "decision_options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "carry_forward" BOOLEAN,
    "last_verified_at" TIMESTAMP(3),
    "not_the_same_as" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "register_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "register_notes_principal_user_id_source_kind_source_id_key" ON "register_notes"("principal_user_id", "source_kind", "source_id");
CREATE INDEX "register_notes_organization_id_principal_user_id_idx" ON "register_notes"("organization_id", "principal_user_id");
