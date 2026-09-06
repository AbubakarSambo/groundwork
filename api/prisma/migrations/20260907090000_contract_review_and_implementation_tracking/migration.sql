-- Two situations, because these are two moments: before signing, each side says
-- what it thinks the agreement means; after signing, a quiet recurring read that
-- should mostly say the numbers reconcile and nothing needs anybody.
ALTER TYPE "GroundScenario" ADD VALUE 'CONTRACT_REVIEW';
ALTER TYPE "GroundScenario" ADD VALUE 'IMPLEMENTATION_TRACKING';
