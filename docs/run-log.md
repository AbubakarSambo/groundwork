# Run log

Newest first. One short entry per item. Written as the work happens, unattended.

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
