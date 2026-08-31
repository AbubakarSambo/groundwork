CREATE TYPE "ServiceRequestKind" AS ENUM ('CALL', 'COACHING', 'HANDS_ON', 'INTEGRATION');
ALTER TABLE "call_requests" ADD COLUMN "kind" "ServiceRequestKind" NOT NULL DEFAULT 'CALL';
