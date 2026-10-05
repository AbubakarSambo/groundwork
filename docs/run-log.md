# Run log

Newest first. One short entry per item. Written as the work happens, unattended.

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
