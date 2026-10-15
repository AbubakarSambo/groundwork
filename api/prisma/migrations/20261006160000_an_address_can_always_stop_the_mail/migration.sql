-- An address with no roster row can stop the mail: a new table, and nothing else. No existing row is changed.
CREATE TABLE IF NOT EXISTS "email_address_preferences" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "unsubscribe_token" TEXT NOT NULL,
  "unsubscribed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_address_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_address_preferences_email_key" ON "email_address_preferences"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "email_address_preferences_unsubscribe_token_key" ON "email_address_preferences"("unsubscribe_token");
