-- THE ENGINE'S OWN MARKER, LEFT IN THE MIDDLE OF WHAT SOMEBODY SAID.
--
-- 3,623 record lines still begin "[VERIFIABILITY:HIGH] ", from before the extraction stopped
-- writing it into the text. Four separate read paths strip it, each one found after somebody saw it
-- on a screen, and a fifth that forgets will show it again.
--
-- The column it belongs in has existed the whole time and is null on every one of these rows, so
-- this is not a guess: the marker says HIGH, the column takes HIGH, and the text loses a prefix it
-- should never have carried. A row whose column is already set keeps it; the text is cleaned either
-- way.
--
-- Safe to run twice, and safe on a database that has none.
UPDATE "record_entries"
SET "verifiability" = COALESCE(
      "verifiability",
      (regexp_match("text", '^\[VERIFIABILITY:(HIGH|MEDIUM|LOW)\]'))[1]::"Verifiability"
    ),
    "text" = regexp_replace("text", '^\[VERIFIABILITY:(HIGH|MEDIUM|LOW)\]\s*', '')
WHERE "text" LIKE '[VERIFIABILITY:%';
