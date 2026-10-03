-- A REQUEST PASSES THROUGH APPROVAL STEPS (decision 85, build step 4).
--
-- Leave, spending and a week of hours can now pass through more than one approver, and be passed on
-- when nobody answers. Each request keeps the step it is on, how far down that step's list it has been
-- passed on, since when it has waited there, and who approved each step so far. Every column has a
-- default or is empty, so every request already kept reads as step one, never passed on, as before.
--
-- A week of hours had a row only once it was approved. It can now have one while it waits at a later
-- step, so the three approval columns may be empty until the last step approves; every row already
-- kept has them, and nothing in them is changed.

ALTER TABLE "leave_requests" ADD COLUMN "approved_by_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "escalated_to" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "step" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "step_since" TIMESTAMP(3);

ALTER TABLE "spend_requests" ADD COLUMN "approved_by_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "escalated_to" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "step" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "step_since" TIMESTAMP(3);

ALTER TABLE "time_weeks" ADD COLUMN "approved_by_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "escalated_to" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "seen_minutes" INTEGER,
ADD COLUMN "step" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "step_since" TIMESTAMP(3),
ALTER COLUMN "approved_minutes" DROP NOT NULL,
ALTER COLUMN "approved_by_id" DROP NOT NULL,
ALTER COLUMN "approved_at" DROP NOT NULL;
