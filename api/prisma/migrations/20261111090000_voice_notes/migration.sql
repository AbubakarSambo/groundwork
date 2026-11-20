-- The original of a voice note, as a reference, with what it was heard as. Private; no route serves it.
CREATE TABLE "voice_notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_id" TEXT,
    "user_id" TEXT,
    "channel" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "transcript" TEXT,
    "was_unsure" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "voice_notes_organization_id_person_id_idx" ON "voice_notes"("organization_id", "person_id");
