-- The observation that produced a coaching step is kept next to it, so the first outputs can be read against their input.
ALTER TABLE "coaching_states" ADD COLUMN "last_input" JSONB;
