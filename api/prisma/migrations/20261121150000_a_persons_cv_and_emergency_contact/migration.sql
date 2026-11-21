-- A person's CV and emergency contact, per organisation (Hafsah, 21 November 2026). Two new tables; nothing existing changes.
CREATE TABLE "person_cvs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "person_cvs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "person_cvs_organization_id_user_id_key" ON "person_cvs"("organization_id", "user_id");

CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT NOT NULL,
    "updated_by_user_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "emergency_contacts_organization_id_user_id_key" ON "emergency_contacts"("organization_id", "user_id");
