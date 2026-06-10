-- Add groundAuditLog (Json?) to grounds table for timeline/cadence change tracking
ALTER TABLE "grounds" ADD COLUMN IF NOT EXISTS "ground_audit_log" JSONB;
