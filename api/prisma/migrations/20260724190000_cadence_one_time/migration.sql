-- Add ONE_TIME to Cadence so a ground can genuinely have a single check-in
-- with no follow-up round ever scheduled, instead of the client silently
-- substituting FORTNIGHTLY (which then scheduled and reminded a real
-- session 2 the person was never told about).
ALTER TYPE "Cadence" ADD VALUE 'ONE_TIME';
