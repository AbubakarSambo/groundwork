-- How to talk to one person, remembered across grounds.
--
-- An eighteen-ground org run found the same colleague met as a stranger five
-- times: one participant asked what a "ground" was in five separate grounds and
-- got a good plain answer in each, and the product never remembered he asked.
--
-- This holds STYLE ONLY - does this person need the vocabulary explained, do
-- they answer briefly, have they asked who reads this. It deliberately holds
-- nothing anyone said. A ground is a closed container, and carrying content
-- across would mean a person's account to two colleagues could surface in front
-- of seven, or that a performance plan in March follows them into a cohort in
-- June. Everything in this table could be shown to the person it describes
-- without embarrassment, which is the bar it has to clear.
CREATE TABLE "person_style_profiles" (
  "id"                    TEXT NOT NULL,
  "user_id"               TEXT NOT NULL,
  "organization_id"       TEXT NOT NULL,
  "needs_plain_language"  BOOLEAN NOT NULL DEFAULT false,
  "answers_briefly"       BOOLEAN NOT NULL DEFAULT false,
  "asks_who_reads_this"   BOOLEAN NOT NULL DEFAULT false,
  "grounds_seen"          INTEGER NOT NULL DEFAULT 0,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "person_style_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "person_style_profiles_user_id_organization_id_key"
  ON "person_style_profiles"("user_id", "organization_id");
CREATE INDEX "person_style_profiles_organization_id_idx"
  ON "person_style_profiles"("organization_id");

ALTER TABLE "person_style_profiles" ADD CONSTRAINT "person_style_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "person_style_profiles" ADD CONSTRAINT "person_style_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
