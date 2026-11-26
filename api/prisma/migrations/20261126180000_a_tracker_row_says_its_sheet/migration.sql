-- A payment tracker's row says which sheet it is on (Dangote brief, change 1: every flag cites its sheet and row). Additive and nullable:
-- rows kept before this have no sheet, and say only the file and the row, as before. Safe to run again.
ALTER TABLE "payment_tracker_lines" ADD COLUMN IF NOT EXISTS "sheet" TEXT;
