CREATE TABLE "ops_person_accounts" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ops_person_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ops_person_accounts_user_id_key" ON "ops_person_accounts"("user_id");
CREATE INDEX "ops_person_accounts_person_id_idx" ON "ops_person_accounts"("person_id");
ALTER TABLE "ops_person_accounts" ADD CONSTRAINT "ops_person_accounts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "ops_people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "back_office_passes" (
    "user_id" TEXT NOT NULL,
    "via" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "code_hash" TEXT,
    "code_expires_at" TIMESTAMP(3),
    CONSTRAINT "back_office_passes_pkey" PRIMARY KEY ("user_id")
);
