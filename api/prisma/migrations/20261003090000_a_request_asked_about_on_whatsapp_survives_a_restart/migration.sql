-- A REQUEST ASKED ABOUT ON WHATSAPP SURVIVES A RESTART (decision 82, item 2).
--
-- "Shall I treat this as a leave request?" waits ten minutes for the person's yes or no. It was held
-- in the memory of the copy of the API that asked, so after a restart, or on another copy, the yes
-- or no went into the check-in as an answer. It is kept on the person's WhatsApp thread instead: the
-- kind, the words (the yes hands them to Ask Groundwork, the no puts them in the check-in) and when it
-- was asked. All three are cleared on the answer and after ten minutes. Three empty columns and an
-- index on one of them; nothing existing is changed.

ALTER TABLE "whatsapp_threads" ADD COLUMN "request_kind" TEXT;
ALTER TABLE "whatsapp_threads" ADD COLUMN "request_words" TEXT;
ALTER TABLE "whatsapp_threads" ADD COLUMN "request_asked_at" TIMESTAMP(3);

CREATE INDEX "whatsapp_threads_request_asked_at_idx" ON "whatsapp_threads"("request_asked_at");
