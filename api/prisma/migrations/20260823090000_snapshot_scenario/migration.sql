-- One honest read from everyone, once.
--
-- PULSE_CHECK already existed and is NOT this: its prompt pack asks "what has changed since the
-- last check-in", so it is the recurring read on live work. A person who wanted a single
-- temperature read had to open a recurring ground and abandon it after one session.
--
-- Additive only. No existing row changes, and nothing reads SNAPSHOT until the picker offers it.
ALTER TYPE "GroundScenario" ADD VALUE 'SNAPSHOT';
