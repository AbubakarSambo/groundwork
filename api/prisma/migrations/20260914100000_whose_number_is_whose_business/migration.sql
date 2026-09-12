-- WHETHER PEOPLE SEE EACH OTHER'S NUMBERS.
--
-- Ten salespeople each saw all ten targets on their first screen and nobody decided that. Narrow by
-- default: a default that publishes is not a default. Every existing check-in gets THEIR_OWN, which
-- changes nothing for any of them because none has a target with an owner on it.
CREATE TYPE "WhoSeesTargets" AS ENUM ('THEIR_OWN', 'EVERYBODY');
ALTER TABLE "grounds" ADD COLUMN "who_sees_targets" "WhoSeesTargets" NOT NULL DEFAULT 'THEIR_OWN';
