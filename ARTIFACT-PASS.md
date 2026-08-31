# Section-by-section pass through the three artifacts

Each line is done AND tested (guard written, bite-checked) unless marked otherwise.

## Artifact 1 — Seven Tabs

### Tab 1 · Check-in
- [x] Header keeps the state — added to the PARTY page too; it only had it on the lead's
- [x] One card, two things: the brief, and who is in this with the privacy rule
- [x] Off the card: the name, the scenario chip, the session count, the alignment read
      (all four were in the header a centimetre above, on both pages)
- [x] Bug: the model says "confirm the renewal ground". The vocabulary guard walks the CLIENT tree,
      so every string a person can type was fixed and nothing checked what the model says back.
      Fixed at `forHumans`, the boundary every reply already passes through — arithmetic, not
      compliance, because the prompt instruction was already there and leaking.
      Narrow on purpose: this text quotes people, so "the renewal ground" converts and
      "gained ground" / "a lot of ground" / "the ground rules" do not.

### Tab 2 · Report
- [x] One report: the standalone page's body renders in the tab, the route redirects
- [x] Order: the read → reveal status → the areas → the decision
- [x] The resolution decision at the foot of Report
- [x] "What now?" is buttons: copy the link, open a follow-up. The one thing no button can do
      stays as a sentence, below the controls
- [x] Off: the second copy of the header's read; the Venn-view link
- [x] The four reveal tiles read inconsistently — DECIDED: don't tidy. Left as they are.

### Tab 3 · Sessions
- [x] One row per person, a cell per session, status per cell
- [x] One number not three: the three stat tiles are gone, the header carries the line
- [x] Each person's expectation state on their row: set / seen / none yet, opening Context
- [x] The participants list arrives here from Overview
- [x] A target gets pressed on in the next session (prompt)
- [x] Off: the four editing panels — no tab sets a target at all now

### Tab 4 · Context (was Documents)
- [x] Labelled by audience, not by what the thing is
- [x] One list of accepted file types — there were THREE, plus two more in the file picker,
      and HEIC (what a phone camera makes) was refused by an attribute while the API accepted it
- [x] Buttons say why they are dead
- [x] A shared note the team can read
- [x] Rename the tab to Context — DECIDED and ON. Default flipped; the whole page lit up: the tab,
      the three visibilities, the context chat, the context-strength read.

### Tab 5 · Team board
- [x] Out of the tab row, opened from the foot of Report
- [x] Framing panel collapsed after first read (already built)
- [x] Dropped "Open your report →" — you came from there

### Tab 6 · Overview
- [x] Cut, and its five parts rehomed

### Tab 7 · Setup (was Check-in settings)
- [x] Renamed to Setup
- [x] The work-together choice leads, and says what it decides
- [x] No targets set here
- [x] The private note about each person — DECIDED: context is fine. Stays on Context with the other
      inputs and their audience labels; Seven Tabs' Tab 7 line is superseded.

## Artifact 3 — Who Sees What

### The write-actions table, checked row by row
- [x] Change timeline or rhythm — the table has the org admin able to; the code refused them.
      Fixed, same split as the context powers: release and close permitted, reschedule not.
- [x] Release the report — org-scoped, and the button says "Release on the lead's behalf"
- [x] Decline a session — own check-in only, so a party can and a non-party has none to decline
- [x] Upload a document — DECIDED: this is fine. Parties only; an admin adds context by note or chat.
- [x] Invite, chase, resend — lead only, which is what the table says

### The click paths
- [x] "The lead's path is the longest for the same act — 4 steps." VERIFIED NO LONGER TRUE: the lead
      can answer from the tab they land on ("Check in for session 1 of 12 →"), so it is 3 steps, the
      same as a participant's. The pill is now only for their OTHER party surfaces, and both views
      say which one you are on.

### Tab by tab, per role
- [x] Report · a participant sees their own record the moment they finish — `insightsLocked` means
      "no completed session yet", not "unpaid"; the first session of every check-in is free
- [x] Context · a participant sees EVERY expectation in the check-in, not only their own
      (`personObjective.findMany` is scoped to the check-in, with no viewer filter) — except where
      peer visibility is off, which is the lead's deliberate setting
- [x] Sessions · a participant sees their own sessions only, and their own expectation
- [x] Setup · nothing on it is theirs to change, and it says why

### Roles and the fourth case
- [x] The button renamed: "My own account →", not "My check-ins"
- [x] Both pages say which of the two views you are on, permanently
- [x] Reciprocal: the party page offers "Admin view →" back
- [x] Org admin can write context and use the context chat — they could release and close and not
      steer, which is the powers split the wrong way round
- [x] A participant's Setup says outright that nothing on it is theirs to change, and why
- [x] THE CONTRADICTION: propose/accept removed — panel, client API, routes and service methods.
      A party can read their expectation and cannot accept or rewrite it, by form or by API.
- [x] A participant's Sessions: their own sessions only, and their own target. The sessions half was
      already right; the target half REGRESSED when the accept-panel was removed, and is back as the
      same one-line reading the lead's rows use, pointing at Context.
- [x] The context-strength read for participants. It EXISTED, gated on CONTEXT_ENABLED — so the
      "the lead holds context you cannot see" line vanished in exactly the state where it is most
      true (flag off = every document private to its uploader). The sentence is now shown to a
      non-lead either way, from one definition so the two cannot drift.
- [x] A party's own notes: VERIFIED already built end to end. `ParticipantNote` +
      `carriedIntoCheckInId` (so it is raised once, not in every session after), `buildNotesBlock`,
      a `between-session-notes.ts` module with its own spec, and write/delete in the chat.

## Artifact 2 — The Context Page

### The two axes
- [x] Visibility is a per-item choice; quotability is fixed by the KIND of thing. Enforced: the
      shared note carries its limit in the same prompt block as its text, and the audience filter
      is in the query, not the render.

### The guarantees this page has to keep
- [x] All six asserted as ONE contract in `the-context-page-keeps-its-promises.spec.ts`. They were
      each enforced somewhere sensible across five files, with nothing saying they are a set —
      and a limit nobody can see the whole of erodes one reasonable-looking change at a time.

### The five inputs
- [x] 1 · Documents — visibility chosen by uploader; one accepted-types list; honest empty state
- [x] 2 · The context chat — live. Its reply had NEVER passed through `forHumans`, found the moment
      the flag went on: it opened with "To set up this ground". Routed through the boundary, which it
      had been skipping entirely — markdown, dashes, house style, all of it.
- [x] 3 · The lead's notes — private, never quoted, per-person or whole-check-in
- [x] 4 · The shared note — NEW, built: lead writes, everyone reads, never quotable, whole
      check-in only (a shared note about one person is refused outright)
- [x] 5 · A party's own notes — verified built: raised once, never part of the record
- [x] 6 · Expectations — elicited, published, aligned, objectionable, never edited by form


## After the flag went on — what had never been exercised

Turning Context on ran a large amount of code for the first time. Verified live, end to end:

- upload → the model reads the file and proposes what it will do with it
- a document is created **Own**; opening it is a deliberate act
- **Open** → a participant receives it. **Closed** and **Own** → they do not.
- a participant trying to change somebody else's document gets `404 Document not found`,
  not "not yours" — the refusal does not confirm the document exists
- the context chat replies now go through the outbound boundary; they never had
