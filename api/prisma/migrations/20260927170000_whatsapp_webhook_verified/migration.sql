-- CONNECTIONS (U.18, F1). One new column, empty until Meta checks the address: when the organisation's
-- WhatsApp callback address last answered Meta's subscribe handshake. Nothing existing is changed.
ALTER TABLE "whatsapp_connections" ADD COLUMN "webhook_verified_at" TIMESTAMP(3);
