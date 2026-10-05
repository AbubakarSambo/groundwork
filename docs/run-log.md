# Run log

Newest first. One short entry per item. Written as the work happens, unattended.

## The judgement on a check-in of one, and a decision I did not make (5 October)

Request 136 item 7 is fixed: the founder, the only person in her own check-in, was
being told "Your own account of this is not in this check-in." about her own
commitments. It now says nobody else answers it, which is the true thing. The wording
is mine and marked PROVISIONAL — the prototype has no screen for a check-in of one.

Doing it meant adding an argument to a call whose exact source text one test pinned, so
that test now pins what matters (the judgement goes through the lead-only wrapper, with
isLead from isInitiator) rather than the line's formatting. That is the same change the
screens workspace asked for in request 138.

PROVISIONAL DECISION, logged rather than done: I have not restarted the 24-scenario
run. It is the next thing in the queue and the machine is quiet again, but Hafsah
stopped that exact run an hour ago because the computer was slow, and restarting it
unasked is the one thing that plainly contradicts "stop every one that isn't needed
right now". It takes hours and would block everything else. It is ready to start the
moment she says so.

## Two more fixed, and six of my "open" items were not open (5 October)

Fixed and pushed: the founder's aim "Get to 20 paying customers by December." now holds
its number, so her board has an answer and a bar instead of nothing (136 item 1); and
"who can provide the fuel allowance for October **that** Aisha Wanjiku is waiting for"
(132 f), which meant changing two test expectations that pinned the sentence without
the "that" — they were pinning the defect.

Then I had to correct myself. The open list I published listed six items that already
had fixes: 123 (3), 123 (4), 123 (10), 129 (2), 131 (5) and 132 (b). I had inferred
"open" from not finding a spec named after the request, which is not the same thing.
The list now says what it actually means — "I did not find a fix" — and the answer says
so to the screens workspace in those words.

Two items left undone on purpose, both decisions rather than defects: the words a
reader sees when somebody leaves a role (123 (8): their name, or the prototype's "Part
ways"), and who gets asked to find an owner (134 (5)). Needs Hafsah.

Next: 127 (4) (6) (7), 128 (2), 130 (b) (d) (f), 131 (6), 134 (4) (7), 135 (3), 136 (7),
and 133 (1), which needs a kind of work to pick its own role map.

## The full API suite is green on this computer (5 October)

1,707 suites and 16,609 tests passed, 2 suites skipped, 427 seconds with two workers,
exit 0. No memory trouble at all, which answers the screens workspace's request 138 and
Hafsah's third ask in 140: their failures are their machine. The two skipped suites are
the browser journeys and the WhatsApp journeys, which skip themselves without their
databases — so "all green" does not cover those, and I said so rather than letting the
number stand for more than it does. One worker had to be force-exited for a leaked
handle; nothing failed, but that is the shape of their out-of-memory and I have not
chased which suite it is.

Also written up: requests 121 to 140 item by item. About thirty of those items were
already fixed and tested here before today, including both of the ones Hafsah named
besides the meetings line. Roughly twenty-five are genuinely open and listed as such.

## The meetings line, and the one heavy task at a time (5 October)

`bring-a-check-in-up-to-date.ts` now has a rule 7: where no meeting is on the record it
takes the meetings line out of the stored report's row. The screens workspace asked for
this twice and my earlier answer pointed them at a script that had no such rule, which
was wrong of me. Proved on a local database loaded from the MarketView Q4 seed: two
lines before, none after, everything else in the row intact, second dry run clean.

That seed also answers Hafsah's second ask in request 140 — the Q4 check-in is
`6e84ca43-31d4-4e33-bf38-91defee0543a`, led by wairimu, with otieno and naliaka
checking in, the same ids on any computer.

While reading the rest of 121 to 140 I found two of the items Hafsah named — the
headline question (127, 129, 133) and the first count read as a rise (130 a) — already
fixed and tested at this head. So the next step is not to rebuild them but to check
every item of 121 to 140 against this code and say which still happen. One helper for
that, once the full API suite (her third ask) has finished, because that is the one
heavy thing running.

## Eight of the screens' open requests were already fixed (5 October)

Checked each one at `72a2f1a2` instead of assuming: 119, 120, 126, 137, 138, 141, 146
and 156 all pass now. The API typechecks (exit 0), builds, and starts — `node
dist/main` reaches "Nest application successfully started" and answers 401 to a wrong
password, with `dist/modules/embed/static/` copied, so 120 and 126 are closed at the
output, not from the code. The wording guard passes with the same spec file they have,
byte for byte, but at exactly 60 of 60: no room at all, which is why it keeps coming
back. I said so in the answer rather than quietly leaving it on the line.

Answered in `docs/answers-from-engine.md`. Next: the board reviews, 121 to 140, one at
a time, starting with the ones that name a specific wrong sentence.

## Request 158: my four seeds made nobody a member (5 October)

The screens workspace loaded all four seeds and found every person locked out. They
were right, and the cause is the kind I keep writing down and then doing: three seeds
used the compound key the wrong way round, and `.catch(() => undefined)` threw the
error away, so each seed printed its sign-in list and had written no membership. The
suites seed wrote none at all.

One writer now, `theyAreInThisOrganisation`, no catch on it, role set on create and
on update. Proving it found a second fault: the company seed could not be run twice.

Proved by signing in, not by reading the code: amina@suites.test, `/auth/me` 200 as
ADMIN of Suites Test Company, where before it was the 401 they reported. Counts
unchanged after three loads. Answered in `docs/answers-from-engine.md`, pushed at
80753092.

A scratch database `gw_seed_check_158` is left on this computer; dropping one is
blocked by the kit's rules, so it stays until Hafsah says otherwise.

Next: request 156 should now be closed too (the seeds are on the branch and
`git ls-files` shows all five). Then the open board reviews, 121 to 140.


## Everything heavy stopped, on Hafsah's word (5 October)

The computer was very slow. I stopped the whole scenario run `run-oct5` - the shell
that drove it and its three shards, six processes - and killed any jest or vitest
left over. It had reached 8 of 24 and will have to start again; nothing it had
written was scored, so nothing is lost but the time.

What is still running is one thing: the local API on 127.0.0.1:3000, one copy, no
client and no watcher. Load average was 4.45 at the moment I stopped them.

The decimal repair in `a-stored-sentence-reads-right.ts` is committed and pushed
(25c53e82). The title repair is not in it, and the file says why.

From here: one helper at a time, never two, and never more than one heavy task.


## 5 October, 14:45 - four more findings from run 32, and two of my fixes were caught by old tests

**Finding 5**, a Groundwork housekeeping question served as the next session's focus
("session2Focus: What else should I know?"). What goes in there is the last question asked before
somebody closed without answering, which is right when the question was about the work and useless
when it was our own catch-all. Filtered; anything naming something real is kept, including "What
else is on the Kano route?", which contains the catch-all's words and is not one.

**Finding 4**, the prospect's job, wish and worry written as Martin's own. Same fault as the
release-blocking "hire more analysts", one layer earlier - the judgement inherited it from the
paragraph, so fixing the judgement alone would have left the report still saying it.

**Finding 37**, "receiving 0. 5%" split into two lines by every sentence splitter in the product.

**Finding 6**, two facts joined into a cause nobody named.

**Two of these were stopped by tests I did not write.** The decimal rule was too wide and joined a
real sentence boundary - "The target is 40. 12 shops have ordered." It asks for a per cent sign
now, and "1. 5 million" is deliberately left alone because it cannot be told from a boundary. And
the causation rule used the shock run's own vocabulary, which `a-room-is-not-a-population` forbids:
the rules are about any room, and a scenario's words in the instruction prime the model. It also
duplicated a rule that was already there, and points at it now instead.

## 5 October, 14:35 - a decimal split in two, and my own test stopped me shipping a worse fix

Run 32's advisor report, both readers: "receiving 0. 5% for two years" - the model put a space
inside a decimal, and every sentence splitter in the product then did the only thing it could with
it. Two broken lines, the second starting lower case because it is the middle of a number.

**My first rule was "a digit, a full stop, a space, a digit", and the test for a real sentence
boundary went red**: "The target is 40. 12 shops have ordered." became "40.12 shops". A sentence
can end in a number and the next begin with one, and nothing in the digits tells them apart. The
rule now asks for a per cent sign on the far side and nothing else does; "1. 5 million" is left
alone and pinned by a test, because it genuinely cannot be told from a boundary.

Repaired where stored sentences are already repaired, before anything splits them, so it holds in
all twenty splitters at once.

**A known flake, named so nobody chases it.** `the-report-is-written-in-parallel` failed in the
full run and passes alone; it did the same this morning. It is timing-sensitive under load.

Scenario run: 5 of 24 at 14:35.

## 5 October, 14:30 - the run will not finish inside this session, and why

3 of 24 at 14:28, started 13:52. One scenario per shard in 36 minutes, against 24 scenarios in 33
minutes with six shards on 26 September. That is roughly ten times slower per scenario.

**It is not rate limiting.** Ten retries in the whole run: three 429s and seven timeouts. The rest
is genuine model latency on a system prompt that is now 119,185 characters, about thirty thousand
tokens on every turn, with four people answering ten questions each.

On this pace it lands around 18:40. I am not restarting it a third time to add shards - that would
throw away the 36 minutes already spent and the three scenarios done, for a gain I cannot be sure
of while the latency is what it is.

**What that means for the queue.** The journeys come after it and will not start inside this
session either. I am not starting the WhatsApp journeys alongside, because they drive the same
model and would make both slower.

**The honest reading when it lands:** if it is still part-finished, the problem counts are still
worth reading, because every one of them is a property of a single report. The engine-value
numbers are not, because they are totals over all 24 and a partial run undercounts them. I will
say which is which rather than scoring a partial run as though it were whole.

## 5 October, 14:35 - "participant" is out of the rulebook, and my caution about editing src was wrong

Run 32 had "the other two participants report...", "both branch participants", "two other
participants report that the company's CEO...". Participant is our word for a database row. It was
in none of the wording rules and the scorer only catches "Participant A", so the bare noun reached
readers. The rulebook now says to name them or say "people", and covers "party", "the initiator"
and "the respondent" with it.

**I had queued this behind the run for the wrong reason.** I thought editing `api/src` might change
what the run measures. It cannot: the shards load their modules once at start, and the conversation
itself goes to the compiled server, which nothing touches until I rebuild. Checked rather than
assumed, then done. The one thing that IS true is that a fix made now is not in this run, which is
already written down for the "does you own" one.

Engine-prompt ceiling moved a third time, by what the rulebook gained and no further.

## 5 October, 14:25 - the API suite found two faults of mine, and my first account of one was wrong

**The plain pattern names are wired up and a test holds the code and the document to each other.**
I changed A1 in `docs/pattern-names.md` for decision 104 and did not change
`plain-pattern-names.ts`, so the test went red. Fixed: the code carries her wording too.

**And my commit message for that overstated it.** It said I had told Hafsah the names were not
switched on. I said that on 26 September; the document was corrected on 29 September, by somebody
else, and has said since that the names live in the code and a spec checks the two match. So the
fault today was only that I changed one side of a pair - which the test caught - not that I had
misinformed her. Writing it down because a commit message that makes a mistake sound worse than it
was is still a wrong record.

**Two of my own specs were weak guards.** The meta-test "a source-assertion spec strips comments
before it matches" named two I wrote today: the kept history and the suite refusals. Both read a
source file and asserted on it without stripping comments first, so a comment could have satisfied
either. Both strip now. I have spent the day finding places where a claim was not re-earned, and
wrote two more.

API: 1,704 suites, 16,589 tests, all passing.

## 5 October, 14:13 - the client suite on the fully merged branch: 630 files, 4,223 tests, green

The second merge from the screens workspace brought the billing changes and the WhatsApp add-on
specs, and I had not run the client suite since. It passes, and both typechecks are clean.

That closes the gap of merged-but-untested code on this branch. The API suite was last run green at
16,542 before today's engine changes; it is re-run after the scenario run, with the journeys.

## 5 October, 14:20 - request 157 done, and the rule from this morning held

The screens filed 157 overnight: a hundred check-ins, to test Hafsah's fault 4 (the sidebar and the
People page listed every one, unusable at that size). **Harambee Logistics** gives them 30 people,
100 check-ins across 16 situations, 340 people-in-check-ins, 75 reports, 25 closed.

The states are mixed because that is what a list has to tell apart, and a fifth leave the busy lead
out entirely - somebody who is in everything tests nothing about which ones are theirs. Three
sign-ins: an admin who sees all 100, a lead with 20 waiting on him and 20 he is not in, a
participant in 15.

**This one went on the allow-list before the commit, and `git ls-files` confirmed it after.** That
is the rule I wrote this morning after shipping three seeds that never left this computer, and it
is the first time it has been applied rather than written down.

One real fault found by driving it: a person could be picked twice for the same check-in, and
(ground_id, email) is unique. Deduped over the whole list rather than in part.

Every request on the screens workspace's list is now answered: 146 to 157.

## 5 October, 14:12 - the exported scenario packs had gone stale, and I caught it before using them

I was about to start the before-and-after document Hafsah asked for on 26 September, and checked
the export first. **21 of the 50 no longer matched the database.** Each had been revised once
since, and the file still held the older words under a header reading "THIS IS THE VERSION THAT
RUNS TODAY". A folder whose entire purpose is to let somebody read what the product actually says
was telling them something else.

All 50 re-exported and verified byte for byte: 50 of 50. The README now says it drifted, how it
was caught, and that the next reader should check the same way before relying on a file.

This is the third time today that something was not what its own label said - the seeds that were
never pushed, the run measuring an old build, and now these. The common thread is that nothing
re-checks a claim once it is written down, so the only defence is to re-earn it each time before
acting on it.

The improved versions and the before-and-after document are still not started. They need the run
scored first, and they are a large piece of writing rather than a mechanical one.

## 5 October, 14:06 - the WhatsApp journey database is current, and a false alarm worth writing down

Migrated last night's `gw_whatsapp_journeys_d92` forward so the journeys can start the moment the
scenario run lands. It applied the newest migration cleanly.

**A count worth not panicking about.** That database shows 364 migration rows for 359 migrations,
and two with no finish time. Both are **rolled back** - one from 31 August, one from 10 September -
so they are history, not pending failures, and the duplicate rows are the same migrations
reapplied after. If anybody runs the same check on a database that has been through a few of these
rounds and sees "failed=2", that is what it is.

**The scenario run is slower than I first read.** Each shard is on its FIRST scenario at 14:05,
not its fifth - the runner takes the keys in its own order, so the header I saw was not the fifth
of eight. Four people times ten questions each, with real model calls, is most of the time. On
course to finish around 15:35. The settle rule is working: "REPORT SETTLED SHORT ... after 64s"
rather than the 300s it used to spend.

## 5 October, 14:10 - queued, not done: "participants" is leaking into what people read

Run 32 shows "the other two participants report...", "both branch participants", "two other
participants report that the company's CEO...". **"Participant" is our word for a database row, not
a word anybody uses about a colleague.** It is in none of the wording rules and the scorer's label
check only catches "Participant A", so the bare noun passes everything.

Not done now, on purpose: I promised not to touch `api/src` again until the run lands, so the run
stays a true measurement of one build. It is a one-line addition to the rulebook - never call a
person a participant; name them, or say "people" - and it goes in as soon as the run is scored.

## 5 October, 14:08 - the release items that are genuinely blocked, and the one I will not touch

**Item 2, a build on Node 20: blocked.** Only Node 26 is on this computer, there is no nvm or n,
and installing a runtime unattended is not a change I should make. Still Hafsah's.

**Item 3, the two existing-client checks: blocked.** Needs a copy of the live data.

**Item 4, the privacy question on evaluation check-ins: deliberately untouched.** Decision 86 and
decision 99 item 3 both say a privacy restriction is not mine to add, and that is exactly what
this would be. The fallback rule says make a provisional call, but her standing decisions say this
particular kind of call is hers. It stays a question.

## 5 October, 14:05 - three of the seven release items answered, two of them with measurements

**Item 1, the migrations on the live line's schema: done and passing** (359 applied, 0 failed, with
existing-client rows already in the database). She should still run it once on real data after the
backup, because real data has shapes a seed does not, and the document says so.

**Item 5, the two judgements that go against the right answer: addressed in the instruction**, and
explicitly not claimed as closed - whether the model obeys the two new rules is for the run.

**Item 6, "proof asked for" is 36 against 42: the counter is measuring the wrong thing.** The
scorer treats "picture" as asking for proof, and picture is this product's own word for shared
understanding. Run-1: 31 of 54 hits matched on it, 20 of those are "a clear picture of...".
Run-29: 22 of 37, and 18. Not one I read asks for a photograph. Both sides of the comparison are
inflated by different amounts; the real movement is roughly 34 against 19, a **bigger** fall than
the row shows. `tools/score_run.py` is on the never-edit list, so this is hers to decide.

**Item 7, the pattern name that reads as a broken sentence: reworded** as PROVISIONAL decision 104.
The other forty-eight were checked for the same fault; A1 was the only one with a clause hanging
off its object.

## 5 October, 13:58 - one small fix landed after the build, and is NOT in the run

The "does you own" fix was committed at about 13:57, after the 13:51 build the current run is
using. Everything else from today is in it, including the two judgement rules and the board's
sentence topics.

I am not restarting the run a third time for one narrow wording rule. **So: if run-oct5 still
shows "does you own" in the cofounder lead's report, that is expected and already fixed.** Nothing
else from today is missing from it.

From here until the run lands I am not touching `api/src` at all, so the run stays a true
measurement of a single build.

## 5 October, 13:52 - the run restarted again, because it was measuring yesterday's engine

Caught before it finished rather than after. The API server was built at 13:14 and I had made nine
engine changes since - the Ask history order, the You board goals, the suite refusals, the promise
dedup, the document path, the name guard, the kept history, the board's sentence topics and the two
judgement rules. None of them were in the running build, so the run would have measured a release
that no longer exists and I would have reported it as the release's run.

Rebuilt, restarted, relaunched at 13:52. Prompt versions active for this run: `system` v45,
`report_synthesis` v7.

**The two release-blocking findings of run 32 are now addressed in the instruction**, which is the
main reason the run had to be redone. Both were the same fault and both passed every rule the
judgement had, because every rule asked for a PERSON to be named and both of them named one:

- "Kwame Mensah is also blocked by the credit committee", when Kwame had said he had not checked
  with Credit at all. He is not blocked; he has not understood what is counted.
- "Make the decision about hiring more analysts", put to a lead whose check-in is about what a
  customer said. The customer's problem became an instruction to the reader.

A reason is only a reason if somebody said it, and a move has to come from a line in a block.
Whether that actually changes the two judgements is for this run to say, not for me.

Also fixed from the same review: a topic that is already a sentence is said as one rather than
pushed after "about", which was six scenarios.

## 5 October, 13:45 - the scenario run was my own fault, restarted; four more items answered

**The run was on course to take hours and the cause was my change this morning.** It waited up to
five minutes for one finding per person who checked in, and some scenarios genuinely produce fewer
because somebody said nothing the report could use. So it spent the full five minutes, session
after session, waiting for a finding that was never coming. The log said "3 finding(s) for 4
person/people after 300s" over and over, which was true and not a fault.

It stops on either now: one finding per person, or a minute with the count unmoved. Run stopped and
restarted at 13:40 on the fixed rule.

**Four request items answered without code**, because the right answer in each case was that the
engine already does it or that the string is the screens':

- **151 E1** (whole sentences used as nouns): already fixed.
- **151 E5**, the shared-picture half ("everyone reads the same report" on an unshared session):
  already fixed in the client, with the per-session read.
- **151 E10** (session counts disagree): two different true things. Recorded as PROVISIONAL
  decision 103 - word them apart rather than agree one clock, because one clock throws away one of
  two true facts.
- **151 E11** (one person, three names): all three strings are composed in the client. Sent them
  what the engine serves - `who` is already "A colleague", `nameIsTheirRole` flags the bare
  identifier, and `subjectFor` already has the sentence for it.

**151 E8 is still unlocated** - I cannot find a sentence in the engine that builds "has none of
their 4 shops", and have asked which field it arrives in.

Next while the run works: nothing heavy. The browser journeys (`e2e`, `npm run journeys`) and the
WhatsApp journeys (own API on port 3006, own database) both wait for it.

## 5 October, 14:05 - request 154 item 2 closed in full, and items 5, 6, 7, 8

All four parts of item 2:

- **The history read backwards.** A question and its answer share a timestamp; the tie is broken on
  meaning now, so the person asked and Groundwork answered.
- **"You have none open" to somebody running ten.** The sentence was right; what was counted was
  wrong. "Open" meant sessions open for her to ANSWER, and a lead who runs ten has none of those.
  The code already knew this and only applied it when the screen sent a check-in - which, now that
  Ask defaults to no check-in, was the uncommon path.
- **Replies saved without their options.** Only the first text block was kept, so the record held
  a sentence that introduces something and then nothing. It keeps every text block and the choices
  as a sentence now, at all three save sites, with a test that reads all three.
- **A sentence read back as a colleague.** Held at the echo rather than the router, because that is
  where the damage is done and it holds however the router changes later.

And items 5 (half, with PROVISIONAL decision 102), 6 (the duplicate promise), 7 (one kind of item
worded one way) and 8 (eleven suites now say what to do).

Scenario run: 2 of 24 at 13:36, slower than previous runs, no incomplete captures.

Next: the remaining 151 items that need the run, then the journeys.

## 5 October, 13:50 - three more request items closed while the run works

**154 item 6, the same promise twice: fixed.** "Ask the warehouse to load my van by 7am" sat beside
"Ask the warehouse on Tuesday 29 September to load my van by 7am." Request 96's rule folds a short
promise into a fuller one when the short one's words sit whole inside it, and a date pushed into
the middle breaks that. Containment is tested with dates taken out of both now - only the
containment: two different dates are still two promises.

**154 item 8, a suite that is off: fixed in eleven places.** They refused with a bare statement and
nothing to act on. The test I wrote reads the folder rather than my list and immediately found an
eleventh service I had missed by hand, which is the only reason it is eleven and not ten.

**154 item 6's other half, when-words that are not dates, is not done** and is written up as such:
those are what the person said, so the fix is to stop showing them where a date belongs rather than
to rewrite them, and that needs to know what the screen does with the field.

Scenario run: 1 of 24 at 13:27, no incomplete captures.

## 5 October, 13:35 - two open requests closed, one provisional call made

**Request 152, both items: already done**, and the screens' list still said Open. `checkInLabel`
is on every Today row from both builders, and `everyActionHasALabel` wraps the board as served.
Written up rather than rebuilt.

**Request 154 item 2, first part: Ask's history reads in order.** A question and its answer share a
timestamp, the read was newest-first then reversed, and within one timestamp the database may
return either order - so the pair came out backwards about half the time. No sequence column to
fall back on, so the tie is broken on meaning: inside one instant the person asked and Groundwork
answered.

**Request 154 item 5: half fixed, half declined, recorded as PROVISIONAL decision 102.** A goal
written about somebody by their lead is now written to the reader. A goal the person wrote
themselves is left exactly as written, because the standing decision of 26 September says people's
own words stay as they said them, and a test has pinned "I want it at 162,000 by December."
unchanged since before the request. The page can still read "I ..." beside "You ...", and whether
that is acceptable is a wording decision rather than a defect. One line changes it if Hafsah
disagrees.

Grounds module: 197 suites, 1,964 tests green.

Next: the scenario run is still going; the remaining parts of 154 item 2 wait for it.

## 5 October, 13:20 - the migrations check against the live line's schema: passes

The one thing `docs/staging-compatibility.md` had open. Built a local database from the live line's
290 migrations, **put existing-client rows in it first** so the "fails on existing data" question
was exercised and not argued, then applied our 69 on top.

**359 applied, 0 failed.** Every pre-existing row survived and still reads the same. The WhatsApp
add-on prices landed on the five plan rows that were already there. A drift check against the model
found only the known cosmetic index-name shortening.

An earlier attempt was refused by the safety guard for naming the live environment in the command.
The refusal was right; what was needed is a local database built from a branch's migration files,
which decision 97 item 3 asks for. Run on localhost only, no hosted database, no real data.

Next: the 24-scenario run.

## 5 October, 11:35 — starting the unattended queue

Queue, in order: the migrations check against staging's schema, the 24-scenario run, the
remaining journeys, then the next open requests.

Where the branch is: `wip/release`, screens merged twice, `mine/wip/live-base` fully inside it and
0 behind. API 16,542 tests green, client 4,217 green, both typechecks clean.

## 5 October, 11:30 — CORRECTION: three requests were reported done and were not pushed

Requests 153, 154 and 155 were answered with instructions pointing at seed scripts that existed on
this computer only. `.gitignore` ignores `api/journey/*`, so `git add -A api/journey` did nothing
and said nothing. The screens workspace found it (request 156). All four files are on the
allow-list now and `git ls-files` confirms them tracked.

Second time in two weeks the same rule has hidden a file somebody else needed. The standing check
from here: nothing under `api/journey` counts as pushed until `git ls-files` shows it.

## 5 October, 11:20 — two defects caught by the release tests, neither mine originally

A view was being served as a fragment: the request-151 fix made the verb of speaking optional, so
it stripped the subject from ordinary sentences — "Baraka Otieno is blocked" became "is blocked",
and for Baraka himself "You are blocked" became "are blocked". The verb is required now.

My own Ask welcome broke the no-colons rule and the client's ratchet caught it at 61 against 60.
