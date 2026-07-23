-- Add TIMEFRAME to RecordEntryType so a check-in can record the period
-- the person stated they are measuring the work against (duration feature).
ALTER TYPE "RecordEntryType" ADD VALUE 'TIMEFRAME';
