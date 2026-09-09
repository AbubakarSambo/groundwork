-- The close bar: a check-in may be held once, for a date, a number or a document.
ALTER TABLE "check_ins" ADD COLUMN "close_held_at" TIMESTAMP(3);
