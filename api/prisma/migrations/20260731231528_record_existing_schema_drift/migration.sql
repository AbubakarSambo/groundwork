-- Record changes that were made directly to the databases and never captured as
-- a migration, so that replaying the history onto an EMPTY database produces the
-- schema the code expects.
--
-- Everything here is ADDITIVE. Nothing is dropped: three columns showed up in
-- the drift as candidates for removal, and two of them (prompt_versions.is_draft
-- and activated_by) are still rendered by the prompt-versioning page, so
-- dropping them would have destroyed data a live feature expects. They are
-- declared in schema.prisma instead. organizations.contributor_bypass is
-- referenced nowhere, but removing it should be a deliberate decision with its
-- own migration rather than a side effect of this one.

-- Enum value used by the code (SESSION_FEE billing events) but never recorded.
-- Postgres will not add an enum value inside a transaction with other
-- statements, so this runs on its own first.
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'SESSION_FEE';
