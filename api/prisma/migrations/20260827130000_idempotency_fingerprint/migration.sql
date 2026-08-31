-- A replay must answer the same question that was asked.
--
-- Without a fingerprint of the request body, the same Idempotency-Key sent with a different payload
-- replays the first response - so a client that generates one key per retry loop rather than per
-- operation silently loses every write after the first. The key alone identifies the retry; the key
-- plus the body identifies the operation.

ALTER TABLE "idempotency_records" ADD COLUMN "request_fingerprint" TEXT NOT NULL DEFAULT '';
ALTER TABLE "idempotency_records" ALTER COLUMN "request_fingerprint" DROP DEFAULT;
