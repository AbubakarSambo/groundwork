-- A QUOTE IS THEIR WORDS. One new column, false for every existing row: whether a record line is the
-- person's own words as they typed them, or the record reader's tidied version. A report may only
-- quote a line where it is true. Stamped when a line is written; nothing existing is changed.
ALTER TABLE "record_entries" ADD COLUMN "said_word_for_word" BOOLEAN NOT NULL DEFAULT false;
