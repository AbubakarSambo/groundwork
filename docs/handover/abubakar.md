<!-- ABUBAKAR START -->
## For Abubakar: one list, staging then production (updated 4 November 2026, late night)

**Already on staging:** #405 to #411 (#410 came in with #409). The only thing still to go to staging now is **#413, never dark mode**. Nothing else is to be merged.

**What each change does to existing users, and the read-only queries:** `docs/handover/impact-on-existing-users.md` (pull request #412). **The staging check of 4 November:** the staging check report (on Hafsah's copy) and https://claude.ai/artifact/XbaN1QRRovGLz3GpHvswGN.

### Staging
1. **Merge #413 into staging:** https://github.com/AbubakarSambo/groundwork/pull/413. Two lines of CSS go, and a test is widened. No migration.
2. **Check staging in dark mode.** On a phone or computer set to dark, open Today, a board and setup. They must be in the light theme, with all text readable.
3. **URGENT: run #410's cleanup on staging.** Run the dry run and read the list, then the deals query from the impact file, then the same command with `--yes`:
   `cd api && npx ts-node -P tsconfig.json --transpile-only scripts/setup-words-copied-into-the-leads-first-check-in.ts`
4. **Open two or three real existing organisations on staging** as an admin. Check that their boards, reports and My work show their history, and that no lead's setup sentences reach their team.

**Note:** GitHub Actions on this repository was out of budget. Check that staging deployed after the merge, or deploy by hand.

### Production (only after staging is checked)
1. Back up the production database.
2. Run the four read-only queries from the impact file on production (switches off, WhatsApp numbers, deals for the cleanup, and the trial), and tell the organisations they name.
3. Merge staging into main and deploy. The API's start applies the migrations.
4. **URGENT: #410's cleanup on production.** Dry run, then the deals query, then `--yes`, as on staging.
5. **The switches:**
   - **Free trial:** set a free plan for any organisation the trial query shows with `gets_emails` false. Then switch it on at Admin, System, Pricing (docs/deploy.md step 13a), tell the pilot clients of 14 October that the 4 weeks start that day, and send Hafsah the list for her information.
   - **Daily usage summary:** check its recipients with the query in docs/deploy.md; it should include hjumare@gmail.com. The first email goes at the next 8am Lagos time.
6. **Check production:**
   - Dark mode reads light.
   - A team member sees none of the lead's setup sentences.
   - Setup opens with its first message, saves, and lands on the board.
   - A check-in ends with "Here's what I recorded… Is anything wrong?".
7. **Tell leads** that My work and the patterns fill in again from each person's next check-ins.

**Known, and left for batch 2:** a lead's words about a named person's sales can reach colleagues in the shared report, for example "Stella said remy Rep has sold 5 units this month". This is batch 2's first item, by Hafsah's decision.
<!-- ABUBAKAR END -->
