-- An organisation's own Meta app approves its own templates; our env var is not theirs.
ALTER TABLE "whatsapp_connections" ADD COLUMN "approved_templates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
