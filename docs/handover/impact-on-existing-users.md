# How the seven pull requests affect existing users (read-only review, 4 November 2026)

**Where things stand.** Abubakar merged #405, #406, #407, #408 and #409 into staging on 4 November, as normal merge commits. #409's branch already held #410, so #410 is on staging too. #411 (batch 1) is open. Its branch now has current staging merged in, with no file changes, and GitHub shows it as mergeable. Nothing is on production yet.

Everything below was read from the code, the local test databases and the repository's fixtures. Nothing was run against staging or production. Where a production check is needed, the read-only query is given.

---

## #410, setup stays private (on staging now)

**What changes for people**
- **Lead:** what she says during setup no longer reaches her team.
  - Her first session is saved as done, so she still counts as checked in. Her board line reads "X has checked in, and nothing here needs you this week."
  - Her session 1 has no transcript and no lines.
  - "What success looks like" falls back to "nobody has said anything about it in a check-in yet" until someone says it in a check-in.
- **Team member:** they stop seeing the lead's setup sentences. Under the default target setting ("each person sees only their own"), they also stop seeing colleagues' "what I'm aiming at" lines, on the board and in reports. This is Hafsah's decision of 4 November, but it is the change existing members will notice most.
- **Admin:** sees everything, as before.
- **WhatsApp only:** nothing different.

**The cleanup script** (`api/scripts/setup-words-copied-into-the-leads-first-check-in.ts`)
- **What it finds:** each lead's session 1 that isn't a setup row, has at least one turn, and has all its turns written within one second of each other. Only the old copy did that.
- **What it removes:** every record line of the lead's on that check-in, of any type (aims, promises, updates). The turns, her stored setup report, her setup words and the targets are left alone. It is safe to run twice.
- **What could surprise people:**
  1. **Her real first update goes too.** Under the old flow, her "where things stand today" was inside the setup chat, so those lines are removed with the setup lines.
  2. **Deals built from those lines lose their backing.** A deal keeps a link to the line it came from (`sourceEntryId`, with no foreign key). When the line is removed, the sales count skips that deal (`board/a-sales-aim-is-counted-from-the-deals.ts:540`). A lead whose first deals came from her setup could see her team's sales count drop.
  3. **A session 1 with a single turn also matches.** So would any transcript imported in one batch. None was found on staging, but an import done outside the API would match.
  4. **The stored shared report isn't rebuilt.** Its old wording can stay until the next report is written.
  5. **The dry run prints people's words** (the first 120 characters of each line) to the console.

## #407, phone numbers and the complete boards (on staging now)

- **Admins:** see and can change everyone's phone number under People, whether WhatsApp is on or off.
- **Leads and admins:** see numbers on the person page and in People and setup.
- **Everyone:** sees and edits their own number in Settings.
- **Add, invite and join forms:** now ask for a number.
- **People and setup:** now shows the invite email under each name (it used to show only on hover), and the status sentences are now visible.
- **Surprise:** where WhatsApp is on, saving a number can send the WhatsApp opening straight away.
- **Boards:** the parts removed by accident on 24 and 25 October come back. No stored data changes.

## #406, four weeks after a free trial (on staging now; nothing happens until it is switched on)

**Who gets reminders, and when.** From the day `pricing.freeTrial` is switched on, the organisations covered are those whose free month has ended (`free_until` set), with no subscription and no active care fee, that came from the free trial or the free month of release. The pilot clients of 14 October are included; nobody is exempt.
- **Who is emailed:** admins, leads, and any team member who runs a live check-in. Ordinary team members and people with no email (WhatsApp only) get nothing.
- **When:**
  - three days before a free month ends, an email to admins;
  - then weekly for three weeks;
  - then daily in the last week.

  That's about 10 emails per person, sent between 9am and 6pm in the organisation's own time.
- **Organisations whose free month ended long ago** get the full 4 weeks from the day it is switched on. During those weeks they are back on their free plan, so features they had already lost come back for 4 weeks.
- **After 4 weeks, the pause:**
  - check-ins don't open, and nothing routine is sent;
  - new free check-ins are refused;
  - replies to someone who has just written still go;
  - payment emails still go;
  - nothing is deleted, and everyone can still sign in and read.

**Surprise:** an organisation with no free plan set is paused at the end without ever being emailed (the email sweep needs `free_plan`, but the pause doesn't). The first query in "Before switching on" below finds them.

## #405, the daily usage email (on staging now)

It goes to the back-office team only (the active ops roster). It holds counts and organisation names only, and nobody else receives anything.
- **When:** the first email goes at the first 8am Lagos time after deploy. That's the same day if the deploy is before 8.
- **Surprise:** it has no environment gate, so staging also sends it to staging's roster.

## #408 and #409, speed (on staging now)

- **Web check-ins:** the reply shows first, and the suggested-answer buttons follow a moment later. WhatsApp is unchanged.
- **The lead's Save:** answers at once. The board's targets can arrive later: a retry runs after 30 seconds, 2 minutes and 10 minutes. With more than one API copy, or after a restart, those retries and the report written after Save are lost.
- **Double square brackets:** anything the model writes between `[[` and `]]` is removed. Old stored replies from Groundwork lose any bracketed text when shown again. What a person types is kept.
- **Ask's documents answer** runs on the faster model. The health check calls one engine.

## #411, batch 1 (open)

**1. Old check-ins have no assessments, and nothing fills them in.**
- **No assessments:** on staging, the only thing ever stored in a check-in's report column is the old setup report. A local copy has 1,272 check-ins, 72 with that column and none with an assessment.
- **No backfill:** nothing assesses old check-ins on merge, deploy, start or read. A check-in is assessed only when it closes, is missed or finishes.
- **Board:** looks the same. It still reads the record lines, promises and waits.
- **Session and team reports, Ask, the lead's morning:** fall back to the record lines. Ask's extra facts are empty for old check-ins.
- **My work:** a person's own line for each old finished check-in is empty. Targets, promises and waits still show.
- **Patterns:** empty until each person has two check-ins assessed under batch 1, so the lead's patterns view starts again from zero.
- **Openers:** still work from the record. The "Brian said…" wording and the impossible-claim filter apply only to new check-ins.

**2. WhatsApp verification adds nobody new.**
- **Who is refused:** the number lookup is the same as on staging. Staging already refuses a number it can't match to a person; batch 1 only changes what happens next. Such a person now gets one message, once per number, then silence: "Groundwork does not know this number yet, and it cannot act on what you send from it. To use this number, add it in the Groundwork app under Settings, or through the link you were sent, and then write again." Nothing they send is stored.
- **On an organisation's own WhatsApp number:** the reply is not sent at all.
- **How a person verifies:** they add their number in Settings or through their invite link, or an admin adds it under People.
- **Who is in that position:** a team member with no number on their user or their roster row, or a number stored with spaces, dashes or brackets, with `00` in front, or in local form where the organisation's country isn't known.
  - In the local data, every stored number is in full international form.
  - Members with no number: Baridi Appliances (9 of 9), Okonjo small law (3 of 3), Nkrumah (3 of 3), Adhiambo (3 of 3), Msingi Foods (3) and Riverbank Trading (6). Drop Access and Muchemi & Co have none.
  - Hello Tractor doesn't appear anywhere in the repository or the local data, so it needs the production query below.

**3. The removed switches.** The direct wording and "References and resources" switches are gone, so every organisation gets what Drop Access and Muchemi & Co already had on staging. The organisations that had them off (68 of 73 in the local copy) get these changes:
- the tab becomes "References and resources", and the People and setup, References and My work pages are shown as pictured;
- **the lead's morning summary goes to every lead at 7am.** That's a new daily message for leads who didn't get it before;
- "Nudge" buttons on the board;
- direct wording in emails, WhatsApp and on the board, with the board's explanation lines removed;
- the managing instructions run in every check-in.

For every organisation:
- "What Groundwork recommends" is offered on every check-in, from the next completed check-in;
- suggested answers go;
- organisations that had the switches on may get the "Here is what is new" email once.

**4. Other things people will notice:**
- **The opener:** one plain fact from the record, then one question.
- **Check-in length:** "about ten minutes" everywhere in the app. The approved WhatsApp templates still say "about five minutes" until the new ones are approved.
- **After setup:** "Send N invitations" lands the lead on the board.
- **Invitations:** those already pending at merge keep their old route. Only new setups hold invitations until Send.
- **"Started" counts:** a check-in now counts as started only on the person's first reply, so existing grids show fewer people as started. No data changes.
- **Complaints about the lead:** they go to the person set as HR. With no HR set, or if HR is the lead, they go to the other admins. Most organisations have no HR set, so for them it's the admins.
- **Message limit:** a message can now be up to 30,000 characters (it was 8,000).
- **The migrations:** they add columns and one settings row. Nothing is removed.

---

## What Abubakar must do so nobody is surprised

**Before merging #411**
1. Run the switches query below on production, and tell those organisations' leads they'll start getting a 7am summary.
2. Run the WhatsApp query below on production, and ask the admins of any organisation with members who have no number, or a number in an odd form, to add or correct them under People before the change. That includes Hello Tractor if it appears.

**Before running #410's cleanup** (on staging now, then on production)
1. Run the dry run and read the list.
2. Run the deals query below for each check-in listed. If any deal points at a line that will be removed, tell Hafsah before running with `--yes`, because that team's sales count would drop.
3. Then run with `--yes`.

**Before switching on the free trial (#406)**
1. Run the trial query below. For any organisation where `gets_emails` is false, set its free plan first, or it will be paused with no warning.
2. Tell the pilot clients of 14 October that the 4 weeks start on the day it's switched on.

**After deploying #405**
- Expect the daily usage email at the first 8am Lagos time, on staging too.

**After merging #411**
1. Tell leads that My work and the patterns fill in again from each person's next check-ins.
2. Get the new WhatsApp templates approved, so WhatsApp also says "about ten minutes".

### The queries (read only, counts and organisation names only)

**Organisations that had the switches off** (they get the new wording, tabs and the 7am summary):
```sql
SELECT id, name, direct_morning_on, release_1b_tabs_on,
  (SELECT count(*) FROM grounds g WHERE g.organization_id = o.id) AS check_ins
FROM organizations o
WHERE NOT direct_morning_on OR NOT release_1b_tabs_on
ORDER BY name;
```

**Members WhatsApp can't match yet:**
```sql
WITH members AS (
  SELECT DISTINCT g.organization_id, u.id AS uid, lower(u.email) AS email, u.phone_number
  FROM ground_participants gp
  JOIN grounds g ON g.id = gp.ground_id
  JOIN users u ON u.id = gp.user_id AND u.deleted_at IS NULL
  WHERE gp.left_at IS NULL),
roster AS (
  SELECT organization_id, linked_user_id, lower(email) AS email, phone, active
  FROM people WHERE coalesce(phone,'') <> '')
SELECT o.id, o.name, count(*) AS members,
  count(*) FILTER (WHERE coalesce(m.phone_number,'') = '' AND NOT EXISTS (
    SELECT 1 FROM roster r WHERE r.organization_id = m.organization_id AND r.active
      AND (r.linked_user_id = m.uid OR r.email = m.email))) AS no_number_anywhere,
  count(*) FILTER (WHERE m.phone_number !~ '^\+?[0-9]+$') AS user_number_odd_form,
  count(*) FILTER (WHERE m.phone_number ~ '^\+?0') AS user_number_local_form,
  (SELECT count(*) FROM roster r WHERE r.organization_id = o.id AND r.active AND r.phone !~ '^\+?[0-9]+$') AS roster_number_odd_form,
  (SELECT count(*) FROM roster r WHERE r.organization_id = o.id AND NOT r.active) AS number_only_on_inactive_roster
FROM members m JOIN organizations o ON o.id = m.organization_id
GROUP BY o.id, o.name ORDER BY no_number_anywhere DESC;
```

**Deals that #410's cleanup would leave without their line** (run before `--yes`):
```sql
SELECT g.organization_id, count(*) AS deals_losing_their_line
FROM work_items w
JOIN record_entries r ON r.id = w.source_entry_id
JOIN check_ins c ON c.id = r.check_in_id AND c.session_number = 1 AND NOT c.is_setup
JOIN ground_participants gp ON gp.id = c.participant_id AND gp.party_type = 'INITIATOR'
JOIN grounds g ON g.id = c.ground_id
GROUP BY g.organization_id;
```
This counts every deal built from a lead's session 1. Compare it with the check-ins the dry run lists. The column names follow the Prisma schema's mapped names; check them with `\d work_items` and `\d record_entries` first.

**Who the free trial would remind:**
```sql
SELECT o.id, o.free_until AS free_month_ends,
       o.free_trial_started_at IS NOT NULL AS trial,
       o.free_month_of_release_at IS NOT NULL AS release_month,
       o.free_plan IS NOT NULL AS gets_emails,
       (SELECT count(*) FROM users u WHERE u.organization_id = o.id AND u.deleted_at IS NULL AND u.is_active AND u.role = 'ADMIN') AS admins,
       (SELECT count(*) FROM users u WHERE u.organization_id = o.id AND u.deleted_at IS NULL AND u.is_active AND u.email IS NOT NULL
          AND (u.role IN ('ADMIN','LEAD') OR EXISTS (SELECT 1 FROM grounds g WHERE g.initiator_id = u.id AND g.organization_id = o.id
               AND g.status NOT IN ('RESOLVED','CLOSED')))) AS people_told
FROM organizations o
WHERE o.free_until IS NOT NULL
  AND (o.free_trial_started_at IS NOT NULL OR o.free_month_of_release_at IS NOT NULL)
  AND o.subscription_status IS NULL AND o.care_fee_status <> 'ACTIVE'
ORDER BY o.free_until;
```
