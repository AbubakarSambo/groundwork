-- A six-digit code is a million guesses. Nothing counted them, and a wrong guess left the code
-- live, so a session on a staff account could try until it opened the back office.
ALTER TABLE "back_office_passes" ADD COLUMN "wrong_guesses" INTEGER NOT NULL DEFAULT 0;
