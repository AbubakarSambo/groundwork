-- A QUOTE IS THEIR WORDS, FOR COMMITMENTS TOO. Two new columns, false for every existing row: whether
-- a commitment's text, and its "when", are the person's own words as they typed them. A report only
-- quotes them where they are. Stamped when a commitment is written; nothing existing is changed.
ALTER TABLE "ground_commitments" ADD COLUMN "said_word_for_word" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ground_commitments" ADD COLUMN "when_said_word_for_word" BOOLEAN NOT NULL DEFAULT false;
