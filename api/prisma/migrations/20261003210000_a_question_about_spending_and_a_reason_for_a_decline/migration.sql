-- A QUESTION ABOUT A REQUEST TO SPEND, AND A REASON FOR A DECLINE (decision 85, build step 9).
--
-- Whoever decides a request to spend can now ask the person a question, as leave already allows; the
-- question and answer go in the existing `suite_questions` table. A decline can carry the reason the
-- person who declined it gave, told to the person who asked. One new column, empty on every request
-- already kept; nothing existing is changed.

-- AlterTable
ALTER TABLE "spend_requests" ADD COLUMN     "decline_reason" TEXT;
