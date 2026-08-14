-- WHETHER THE LEAD CHOSE THE PACING, OR WE GUESSED IT FOR THEM.
--
-- `timeline_days` is NOT NULL and `cadence` defaults to FORTNIGHTLY, so every ground has both from
-- the moment it exists. The context chat's gap reader asks "how long should this run?" only when
-- `timelineDays` is absent - and it is never absent, so that question has never once been asked.
--
-- Which is the exact defect G37 was written for: a ninety-day ground created from a single answer
-- with no duration and no rhythm. The duration was not missing, it was DEFAULTED, and the feature
-- built to catch that was looking for a null that the schema does not allow.
--
-- False for everything that already exists. A ground running on a default it never chose is the
-- honest reading of every row written before this column, and it means the chat will offer to fix
-- exactly those.
ALTER TABLE "grounds" ADD COLUMN "timeline_stated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "grounds" ADD COLUMN "cadence_stated" BOOLEAN NOT NULL DEFAULT false;
