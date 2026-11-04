-- Twice or more a week (2 November 2026): the weekdays a weekly check-in meets on, when it meets on more than one. Empty is once a week.
ALTER TABLE "grounds" ADD COLUMN "cadence_days" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
