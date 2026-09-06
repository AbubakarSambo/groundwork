-- The credential that took over from this one. Rotating is issue, deploy, revoke,
-- and without this the page cannot tell "still in use" from "replaced and
-- forgotten" — which is how a superseded key stays live for months.
ALTER TABLE "api_credentials" ADD COLUMN "replaced_by_client_id" TEXT;
