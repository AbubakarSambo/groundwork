-- A ROW CAN BE DISPUTED BY THE PERSON IT IS ABOUT.
--
-- Nine model extractors write record_entries, and every engine, the confidence read, the tiles and
-- the probe list count those rows as record. Nothing compared a row against the words it came from,
-- the person never saw the row as a row, and the only "correction" added a contradicting row beside
-- the wrong one - both then counted equally. This is the smallest change that makes the wall
-- visible: one timestamp, set by the person the row is about, after which the row stops counting.
-- Nothing is deleted or edited; the row and the dispute both stay on the record.
ALTER TABLE "record_entries" ADD COLUMN "disputed_at" TIMESTAMP(3);
