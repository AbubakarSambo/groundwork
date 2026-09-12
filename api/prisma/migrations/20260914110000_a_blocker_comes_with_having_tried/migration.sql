-- WHETHER BEING BLOCKED IS EXPECTED TO COME WITH HAVING TRIED.
--
-- On by default, because it is true of most work most of the time. Off for the real cases: a cohort
-- with no standing to chase anybody, an external party who cannot escalate inside somebody else's
-- company, a crisis check-in where the point is to hear what happened rather than to coach.
ALTER TABLE "grounds" ADD COLUMN "expect_them_to_unblock" BOOLEAN NOT NULL DEFAULT true;
