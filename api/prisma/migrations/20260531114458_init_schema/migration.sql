-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_SETUP', 'PASSWORD_RESET', 'PARTICIPANT_INVITE');

-- CreateEnum
CREATE TYPE "CareFeeStatus" AS ENUM ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GroundScenario" AS ENUM ('NEW_HIRE', 'NEW_COFOUNDER', 'NEW_ADVISOR', 'NEW_PROJECT', 'RECOGNITION', 'DRIFT');

-- CreateEnum
CREATE TYPE "GroundMoment" AS ENUM ('STARTING', 'RECOGNITION', 'RESOLUTION');

-- CreateEnum
CREATE TYPE "GroundStatus" AS ENUM ('OPEN', 'AWAITING_PARTIES', 'REPORT_READY', 'ACTIVE', 'RESOLVED', 'STALLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('INITIATOR', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED');

-- CreateEnum
CREATE TYPE "TurnRole" AS ENUM ('AI', 'PERSON');

-- CreateEnum
CREATE TYPE "RecordEntryType" AS ENUM ('SUCCESS_DEFINITION', 'COMMITMENT', 'ASK', 'INTENT', 'TOLERANCE', 'WORRY', 'TENSION');

-- CreateEnum
CREATE TYPE "PatternStatus" AS ENUM ('CANDIDATE', 'SURFACED');

-- CreateEnum
CREATE TYPE "Cadence" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('CARE_FEE', 'SCENARIO_FEE');

-- CreateEnum
CREATE TYPE "BillingEventStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "stripe_customer_id" TEXT,
    "care_fee_status" "CareFeeStatus" NOT NULL DEFAULT 'NONE',
    "care_fee_subscription_id" TEXT,
    "default_payment_method_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_platform_admin" BOOLEAN NOT NULL DEFAULT false,
    "google_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grounds" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "initiator_id" TEXT NOT NULL,
    "scenario" "GroundScenario" NOT NULL,
    "moment" "GroundMoment" NOT NULL,
    "status" "GroundStatus" NOT NULL DEFAULT 'OPEN',
    "label" TEXT NOT NULL,
    "timeline_days" INTEGER NOT NULL,
    "cadence" "Cadence" NOT NULL DEFAULT 'FORTNIGHTLY',
    "end_state" TEXT,
    "billing_activated_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "prompt_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ground_participants" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "partyType" "PartyType" NOT NULL,
    "role_as_described" TEXT,
    "willingness_evidence" BOOLEAN,
    "willingness_cadence" BOOLEAN,
    "invited_at" TIMESTAMP(3),
    "notified_at" TIMESTAMP(3),
    "invite_token" TEXT,
    "invite_token_expires_at" TIMESTAMP(3),
    "specificity_history" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ground_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "session_number" INTEGER NOT NULL,
    "status" "CheckInStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "patterns_analyzed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_turns" (
    "id" TEXT NOT NULL,
    "check_in_id" TEXT NOT NULL,
    "role" "TurnRole" NOT NULL,
    "content" TEXT NOT NULL,
    "stage" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_entries" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "check_in_id" TEXT,
    "type" "RecordEntryType" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "shared_picture" TEXT NOT NULL,
    "agreements" JSONB NOT NULL,
    "divergences" JSONB NOT NULL,
    "central_question" TEXT NOT NULL,
    "prompt_version_id" TEXT,
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pattern_detections" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "periods_observed" INTEGER NOT NULL DEFAULT 1,
    "last_period_number" INTEGER,
    "status" "PatternStatus" NOT NULL DEFAULT 'CANDIDATE',
    "observation_text" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pattern_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolutions" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "end_state" TEXT NOT NULL,
    "confirmed_by_initiator" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_by_participant" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_initiator_at" TIMESTAMP(3),
    "confirmed_participant_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcomes" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "prompt_version_id" TEXT,
    "resolved_state" TEXT NOT NULL,
    "moment" "GroundMoment",
    "session_count" INTEGER,
    "resolvable" BOOLEAN,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcome_feedback" (
    "id" TEXT NOT NULL,
    "ground_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "felt_fair" BOOLEAN NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outcome_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_intelligence" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "pattern_summary" JSONB NOT NULL,
    "anonymised" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ground_id" TEXT,
    "type" "BillingEventType" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "stripe_invoice_id" TEXT,
    "status" "BillingEventStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "grounds_organization_id_idx" ON "grounds"("organization_id");

-- CreateIndex
CREATE INDEX "grounds_status_idx" ON "grounds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ground_participants_invite_token_key" ON "ground_participants"("invite_token");

-- CreateIndex
CREATE INDEX "ground_participants_ground_id_idx" ON "ground_participants"("ground_id");

-- CreateIndex
CREATE UNIQUE INDEX "ground_participants_ground_id_email_key" ON "ground_participants"("ground_id", "email");

-- CreateIndex
CREATE INDEX "check_ins_ground_id_idx" ON "check_ins"("ground_id");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_participant_id_session_number_key" ON "check_ins"("participant_id", "session_number");

-- CreateIndex
CREATE INDEX "conversation_turns_check_in_id_idx" ON "conversation_turns"("check_in_id");

-- CreateIndex
CREATE INDEX "record_entries_participant_id_idx" ON "record_entries"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_ground_id_key" ON "reports"("ground_id");

-- CreateIndex
CREATE INDEX "pattern_detections_ground_id_idx" ON "pattern_detections"("ground_id");

-- CreateIndex
CREATE UNIQUE INDEX "pattern_detections_participant_id_code_key" ON "pattern_detections"("participant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "resolutions_ground_id_key" ON "resolutions"("ground_id");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_key_version_key" ON "prompt_versions"("key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "outcomes_ground_id_key" ON "outcomes"("ground_id");

-- CreateIndex
CREATE INDEX "outcomes_prompt_version_id_idx" ON "outcomes"("prompt_version_id");

-- CreateIndex
CREATE INDEX "outcome_feedback_ground_id_idx" ON "outcome_feedback"("ground_id");

-- CreateIndex
CREATE UNIQUE INDEX "outcome_feedback_ground_id_participant_id_key" ON "outcome_feedback"("ground_id", "participant_id");

-- CreateIndex
CREATE INDEX "billing_events_organization_id_idx" ON "billing_events"("organization_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grounds" ADD CONSTRAINT "grounds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grounds" ADD CONSTRAINT "grounds_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grounds" ADD CONSTRAINT "grounds_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_participants" ADD CONSTRAINT "ground_participants_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ground_participants" ADD CONSTRAINT "ground_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_turns" ADD CONSTRAINT "conversation_turns_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_entries" ADD CONSTRAINT "record_entries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_entries" ADD CONSTRAINT "record_entries_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern_detections" ADD CONSTRAINT "pattern_detections_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pattern_detections" ADD CONSTRAINT "pattern_detections_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outcome_feedback" ADD CONSTRAINT "outcome_feedback_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outcome_feedback" ADD CONSTRAINT "outcome_feedback_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ground_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_intelligence" ADD CONSTRAINT "org_intelligence_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_ground_id_fkey" FOREIGN KEY ("ground_id") REFERENCES "grounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
