-- The only scenario the spec names that the enum did not already have.
ALTER TYPE "GroundScenario" ADD VALUE IF NOT EXISTS 'ROLE_HANDOVER';

CREATE TYPE "ScenarioCandidateState" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED', 'EXPIRED');
