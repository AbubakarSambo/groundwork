<!-- ABUBAKAR START -->
## For Abubakar: one list, staging then production (updated 4 November 2026, night)

**URGENT: #410's cleanup.** #410 is on staging (it came in with #409), so new setups stay private. The words already copied are still there until the cleanup runs.

**Already merged into staging:** #405, #406, #407, #408 and #409, which includes #410. #411 now has staging merged in and is mergeable.

**What each change does to existing users, and the queries below:** `docs/handover/impact-on-existing-users.md`.

### Staging
1. **URGENT: #410's cleanup on staging.**
   - Run the dry run and read the list:
     `cd api && npx ts-node -P tsconfig.json --transpile-only scripts/setup-words-copied-into-the-leads-first-check-in.ts`
   - Run the deals query from the impact file. If any deal would lose its line, tell Hafsah first, because that team's sales count would drop.
   - Then run the same command with `--yes`.
2. **Before merging #411:** run the switches query and the WhatsApp query from the impact file.
   - Organisations that had the switches off will start getting the lead's 7am summary, the new tab names and the direct wording.
   - Members WhatsApp can't match need their number added under People.
3. **Merge #411** (batch 1): https://github.com/AbubakarSambo/groundwork/pull/411. It adds five additive migrations, and the API's start applies them.
4. **Run the cleanup again** after #411. It is the same script, extended, and safe to run twice.
5. **Check staging:**
   - A team member's board, My work and session report show none of the lead's setup sentences.
   - Setup opens with its first message, saves, and lands on the board.
   - A check-in ends with "Here's what I recorded… Is anything wrong?".
   - `SELECT value FROM platform_settings WHERE key = 'pricing.trialGrace';` shows `"weeks": 4`.

**Note:** GitHub Actions on this repository is out of budget, so staging has not been deploying since 30 October. Top it up, or deploy by hand.

### Production (only after staging is checked)
1. Back up the production database.
2. Run the switches query and the WhatsApp query on production, and tell the organisations they name (see "Before merging #411" in the impact file).
3. Merge staging into main, or the same pull requests in order: #410, #407, #406, #405, #408, #409, then #411. Deploy. The API's start applies the migrations.
4. **URGENT: the cleanup on production.** Dry run, then the deals query, then `--yes`, as on staging.
5. **The switches:**
   - **Free trial:** before switching it on, run the trial query. Set a free plan for any organisation where `gets_emails` is false, or it will be paused with no warning. Then switch it on at Admin, System, Pricing (docs/deploy.md step 13a), tell the pilot clients of 14 October that the 4 weeks start that day, and send Hafsah the list, for her information.
   - **Daily usage summary:** it goes at the first 8am Lagos time after deploy. Check who gets it with the query in docs/deploy.md ("The daily usage summary"); it should include hjumare@gmail.com.
6. **The same checks as staging step 5,** on production.
7. **After #411:** tell leads that My work and the patterns fill in again from each person's next check-ins. Get the new WhatsApp templates approved, so WhatsApp also says "about ten minutes".
<!-- ABUBAKAR END -->
