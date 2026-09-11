-- A WhatsApp number talks to one check-in at a time, and a participant has a language.
CREATE TABLE "whatsapp_threads" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "check_in_id" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_threads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_threads_organization_id_phone_key" ON "whatsapp_threads"("organization_id", "phone");
ALTER TABLE "ground_participants" ADD COLUMN "language" VARCHAR(8);
