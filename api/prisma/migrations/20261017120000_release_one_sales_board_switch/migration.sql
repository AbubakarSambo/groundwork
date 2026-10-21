-- RELEASE 1'S SALES BOARD, A SWITCH PER ORGANISATION (release plan, Part 0: "Each release's new boards sit behind a switch per
-- organisation"). Add-only; the statement can be run again.
--
-- What it does to rows already there: every existing organisation gets the column set to false, so each one keeps the board,
-- the team report and the weekly report it had. Nothing else is read, changed or removed. A new organisation also starts at
-- false. Groundwork staff switch it on per organisation in Admin, Orgs; a test organisation is switched on by script.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "release_1_sales_board_on" BOOLEAN NOT NULL DEFAULT false;
