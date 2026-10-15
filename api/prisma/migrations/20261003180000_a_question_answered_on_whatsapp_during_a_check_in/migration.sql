-- A QUESTION ABOUT A REQUEST, ANSWERED ON WHATSAPP DURING A CHECK-IN (decision 85, build step 7).
--
-- When whoever decides a request asks the person a question, and the person has a check-in open on
-- WhatsApp, their reply went into the check-in. Groundwork now asks once, "Is this your answer to
-- Wairimu's question about your leave?", and holds the words on the WhatsApp thread as it already
-- holds a request waiting for a yes or no. This empty column keeps which question was asked about, so
-- the same question is asked about once only. Nothing existing is changed.

-- AlterTable
ALTER TABLE "whatsapp_threads" ADD COLUMN     "question_asked_about" TEXT;
