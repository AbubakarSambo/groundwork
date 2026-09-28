-- The longitudinal read: commitments, dependencies, patterns, gaps and what is still open, computed
-- from rows rather than routed into by a model.
--
-- Three of the eleven things a founder said they needed came back empty on a live engagement -
-- dependencies, patterns and gaps - while the facts for all three sat in tables the report never
-- read. `leadership_gaps` depends on a synthesis prompt remembering to route findings into it, and
-- on the one engagement that was entirely about a gap, both findings went to divergences instead.
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "over_time" JSONB;
