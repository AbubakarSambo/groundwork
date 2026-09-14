-- WHETHER WE CAN ACTUALLY TELL THAT IT WAS NOT ANSWERED.
--
-- A few slots have no entry type yet, so the conversation can ask but nothing can confirm the
-- answer. Those would sit open for ever against somebody who answered in their first sentence.
-- False means asked and we cannot tell, which is what the lead is told.
ALTER TABLE "check_in_gaps" ADD COLUMN "certain" BOOLEAN NOT NULL DEFAULT true;
