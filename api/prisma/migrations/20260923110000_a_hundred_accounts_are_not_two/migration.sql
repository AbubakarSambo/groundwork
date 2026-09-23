-- A HUNDRED ACCOUNTS ARE NOT TWO, and how the report was shared.
--
-- `network_picture` holds the second read: the one written when enough separate organisations
-- answered that "where do they want to grow, what do they need, how do the kinds differ" is a real
-- question. The alignment report is untouched and still written beside it.
--
-- `shared_as` is the organiser's choice at the moment of sending - named or anonymised - which did
-- not exist at all. Null means it has not been sent to anybody yet.
ALTER TABLE "reports" ADD COLUMN "network_picture" JSONB;
ALTER TABLE "reports" ADD COLUMN "shared_as" VARCHAR(16);
