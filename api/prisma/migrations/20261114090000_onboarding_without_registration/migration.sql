-- Onboarding without registration (Fatima, increment 5): the setup the admin makes, the introductions and what happened to them, the people she names,
-- what is missing and who was asked, and what she forwards before there is a check-in to put it in. Additive only.
CREATE TABLE "principal_setups" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp_number" TEXT,
    "verified_via" TEXT NOT NULL DEFAULT 'admin',
    "replied_at" TIMESTAMP(3),
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "added_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "principal_setups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "principal_setups_organization_id_principal_user_id_key" ON "principal_setups"("organization_id", "principal_user_id");
CREATE INDEX "principal_setups_email_idx" ON "principal_setups"("email");

CREATE TABLE "introduction_deliveries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "reason" TEXT,
    "subject" TEXT,
    "text" TEXT NOT NULL,
    "reply_to" TEXT,
    "send_key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_tried_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "introduction_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "introduction_deliveries_send_key_key" ON "introduction_deliveries"("send_key");
CREATE INDEX "introduction_deliveries_organization_id_principal_user_id_idx" ON "introduction_deliveries"("organization_id", "principal_user_id");

CREATE TABLE "outreach_contacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "contact_key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'proposed',
    "person_id" TEXT,
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposed_by_user_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by_user_id" TEXT,
    "introduced_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    CONSTRAINT "outreach_contacts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "outreach_contacts_principal_user_id_contact_key_key" ON "outreach_contacts"("principal_user_id", "contact_key");

CREATE TABLE "information_gaps" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "gap_key" TEXT NOT NULL,
    "what" TEXT NOT NULL,
    "asked_of_email" TEXT,
    "asked_of_name" TEXT,
    "state" TEXT NOT NULL DEFAULT 'open',
    "asked_at" TIMESTAMP(3),
    "answered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "information_gaps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "information_gaps_principal_user_id_gap_key_asked_of_email_key" ON "information_gaps"("principal_user_id", "gap_key", "asked_of_email");
CREATE INDEX "information_gaps_asked_of_email_state_idx" ON "information_gaps"("asked_of_email", "state");

CREATE TABLE "intake_batches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_item_at" TIMESTAMP(3) NOT NULL,
    "acknowledged_at" TIMESTAMP(3),
    CONSTRAINT "intake_batches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "intake_batches_principal_user_id_acknowledged_at_idx" ON "intake_batches"("principal_user_id", "acknowledged_at");

CREATE TABLE "principal_material" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "principal_user_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "from_user_id" TEXT,
    "from_address" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "hash" TEXT,
    "bytes" BYTEA,
    "size" INTEGER,
    "text" TEXT,
    "subject" TEXT,
    "state" TEXT NOT NULL,
    "because" TEXT,
    "duplicate_of_id" TEXT,
    "inside_archive" TEXT,
    "unsure" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "principal_material_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "principal_material_principal_user_id_batch_id_idx" ON "principal_material"("principal_user_id", "batch_id");
CREATE INDEX "principal_material_principal_user_id_hash_idx" ON "principal_material"("principal_user_id", "hash");
