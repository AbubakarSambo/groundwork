-- Which days this team works. 0=Sun..6=Sat. Empty means nobody said, which is not the same
-- as somebody saying every day. A daily cadence was landing on Saturdays and Sundays because
-- nothing in the product knew what a weekend was.
ALTER TABLE "grounds" ADD COLUMN "working_days" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
