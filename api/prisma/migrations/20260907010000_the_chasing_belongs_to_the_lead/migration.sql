-- Who chases, and how often, belongs to whoever set the work up. The schedule
-- was a constant in the reminder service; these are the same three days, said
-- per ground, where a lead can change them or stop them.
ALTER TABLE "grounds" ADD COLUMN "chase_after_days" INTEGER[] NOT NULL DEFAULT ARRAY[3, 7, 14];
ALTER TABLE "grounds" ADD COLUMN "chasing_stopped" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "grounds" ADD COLUMN "tell_the_lead" BOOLEAN NOT NULL DEFAULT true;
