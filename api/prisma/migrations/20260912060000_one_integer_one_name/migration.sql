-- ONE INTEGER, ONE NAME (fix plan B13). The counter saying which session this is had three names:
-- check_ins.session_number, round_completions.round_number and report_rounds.round. Two renames, no
-- behaviour change; the webhook payload keeps its published key beside the new one.
ALTER TABLE "round_completions" RENAME COLUMN "round_number" TO "session_number";
ALTER TABLE "report_rounds" RENAME COLUMN "round" TO "session_number";
