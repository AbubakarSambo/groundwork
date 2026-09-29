import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { whichSessionIsThisCheckInOn } from '@/lib/which-session-are-we-on'
import { groundTabs } from './ground-tabs'
import { whatAnAdminHereCanSee } from '@/lib/what-an-admin-here-can-see'

/**
 * THE LEAD'S SIDE OF THE GROUND. W8-66, W8-67.
 *
 * Her words: "the chat like slack disappear again, what is happening" - then, when I
 * mounted it for the lead: "what if sets themselves as checkin in too, they need a chat,
 * they also set the context".
 *
 * The chat had never been on this page. `GroundChat` was mounted by
 * `GroundParticipantPage` only, so a participant landed in the conversation and a LEAD or
 * an ORG ADMIN opening the same ground got a list of session cards and no chat anywhere.
 * When the card view was retired the rail toggle went with it, correctly - on the
 * participant page. This one was left as it was, and I reported the work as done.
 *
 * Mounting it then exposed four more things, all of which had been sitting there:
 *
 *  1. "its lead runs this check-in." - a lowercase sentence fragment, because the banner
 *     read `lead.email` and the API NULLS that field for exactly the viewers who see this
 *     banner. The name was in the payload the whole time.
 *  2. Twenty-four check-in cards in no order at all: "Session 4, Session 1, Session 1,
 *     Session 4, ..."
 *  3. "24 of 12 sessions done" - counting rows, where a row is one person's check-in.
 *  4. "Starting" in a status-shaped pill on a check-in with every session finished.
 *
 * Checked as source, because these are wiring and wording rather than behaviour, and
 * because every one of them was rendered correctly by a passing test suite.
 */

const SRC = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the chat is here at all', () => {
  /**
   * ROUND 4, ITEM A STEP 3: GroundChat's INLINE MOUNT ON THIS TAB IS RETIRED.
   *
   * Its three jobs are untangled now: the session history lives on My work
   * (MyCheckInSessions.tsx), "who is in this" lives on People and setup (WhoIsInThis.tsx), and
   * what is left of "the chat is here at all" is that a lead who is a party is sent straight to
   * the focused conversation - not shown a read-only mount of it on this page.
   */
  it('a party is sent to the focused conversation, not shown a mount of GroundChat', () => {
    expect(CODE).not.toContain('<GroundChat')
    /**
     * REVIEW ROUND 3, ITEM 2: NO MORE HAND-OFF TO THE PARTICIPANT PAGE. A lead who is a party
     * used to be sent to `/grounds/:id/p?open=1` to open her own session - a second page, for
     * what should be one check-in. She opens it from here now, through the same shared hook the
     * participant page uses (useOpenSession.ts), and never lands on the other page for it.
     */
    expect(CODE).toMatch(/if \(tab !== 'chat' \|\| !viewerIsAParty\) return/)
    expect(CODE).toContain('openMySession(myOpenCheckIn')
    expect(CODE).not.toMatch(/\/grounds\/\$\{id\}\/p\?open=1/)
  })

  it('and it is the first tab, so it is what you land on', () => {
    /**
     * Her design: "the first thing you land on ... be the chat".
     *
     * The order moved to `ground-tabs.ts` when the two views were put on one list, so the position
     * is asserted there and this checks the page still opens on it.
     */
    /**
     * The initialiser became a function when the old /report route was turned into a redirect to
     * `?tab=report` - the page has to be able to open where a link asks. The DEFAULT is what this
     * protects, and it is still the chat.
     */
    /*
     * WAS PINNED TO THE EXACT LINE, which broke the day ?tab= was taught the shared tab keys
     * rather than this page's private ones. The default is what this protects, so it now asserts
     * the default: whatever the initialiser looks like, no `tab` in the URL lands on the chat.
     */
    const init = CODE.slice(CODE.indexOf('const [tab, setTab] = useState<Tab>'), CODE.indexOf('const goTab'))
    expect(init).toMatch(/searchParams\.get\('tab'\)/)
    expect(init).toMatch(/\?\? 'chat'|: 'chat'/)
    expect(groundTabs({ contextEnabled: true, canRunThisCheckIn: true, isAParty: true })[0].key).toBe('chat')
  })

  it('the session list keeps its own tab rather than being replaced', () => {
    /**
     * A lead scanning twelve sessions for who has not checked in wants the list. That is a
     * different question from reading what was said.
     *
     * It was "Sessions" from W13-8 and is "Record" now: one tab shared with the party view, whose
     * content differs by role. The point of this check is that the list KEEPS ITS OWN TAB rather
     * than being folded into the conversation, which is still true.
     */
    expect(CODE).toMatch(/tab === 'checkins'/)
    /* A lead who is also a party sees both: everyone's state, and their own account. */
    expect(groundTabs({ contextEnabled: true, canRunThisCheckIn: true, isAParty: true }).some(t => t.key === 'sessions')).toBe(true)
    expect(groundTabs({ contextEnabled: true, canRunThisCheckIn: true, isAParty: true }).some(t => t.key === 'record')).toBe(true)
  })
})

describe('a lead who is a party gets the real chat', () => {
  it('the flag keys on being a party, not on being the lead', () => {
    /**
     * HER CORRECTION. Step 6 of setup offers "I am a party. Let's begin." A lead who
     * takes it has their own check-ins and must get the conversation - keying this on
     * `isInitiator` would have given the most common kind of lead a read-only page about
     * a check-in they are actually in.
     *
     * ROUND 4, ITEM A STEP 3: the flag that decides is now the redirect's own condition
     * (`viewerIsAParty`, computed from the same `ground.participants` read), not a prop handed to
     * GroundChat.
     */
    expect(CODE).toMatch(/const viewerIsAParty = \(ground\?\.participants \?\? \[\]\)\.some\(\(p: any\) => p\.userId === user\?\.id\)/)
  })

  it('and a lead who is not one is told plainly, and pointed at the board', () => {
    /**
     * The wall. There is no version of this where a lead reads a participant's turns - and now
     * there is no version where she reads a history summary standing in for them either
     * (GroundChat's non-party `history` branch, retired with this step). She is told this check-in
     * is not hers to answer, and sent to the board, which is where the shared picture lives.
     */
    expect(CODE).not.toContain('history={')
    expect(CODE).toContain('You do not answer this check-in yourself.')
    expect(CODE).toMatch(/to=\{`\/grounds\/\$\{id\}\/board`\}/)
  })
})

describe('the four things mounting it exposed', () => {
  it('the lead is named from the name, not from their email address', () => {
    // `grounds.service.ts` nulls the email for a viewer who is neither the person nor
    // the lead, which is every viewer of this banner. And a name made from an address is
    // not that person's name (W10-2).
    expect(CODE).toMatch(/lead\?\.user\?\.firstName/)
    expect(CODE).not.toMatch(/lead\.email\.split/)
  })

  /* U.7 review: the banner's sentence moved to what-an-admin-here-can-see, so the fallback is read
     there, rendered, rather than looked for in this page's source. */
  it('and the fallback is a whole phrase, so the sentence still reads', () => {
    expect(CODE).not.toMatch(/'its lead'/)
    const said = whatAnAdminHereCanSee({ leadName: null, leadFirstName: null, inIt: false })
    expect(said).toBe('You can read this check-in\u2019s board and reports. You cannot see the lead\u2019s private notes, anyone\u2019s share of a target, or the documents people add here. Sharing the report and ending the check-in are the lead\u2019s to decide, and nothing you do here is hidden from them.')
  })

  /**
   * THE SORT MOVED WITH THE LIST IT ORDERED. The flat run of cards is gone - the tab is one row per
   * person now, with that person's sessions as cells along the row - so "newest first" stopped being
   * the right order: a row of cells reads left to right, 1 2 3, like everything else numbered.
   *
   * What the original protected still holds. It was written because two parties across twelve
   * sessions rendered twenty-four cards in arbitrary order, unreadable as a record. Cells grouped by
   * person and ordered by session cannot produce that.
   */
  it('each person\'s sessions run in order along their row', () => {
    expect(CODE).toMatch(/\(a\.sessionNumber \?\? 0\) - \(b\.sessionNumber \?\? 0\)/)
  })

  /** And they are that person's sessions, not everybody's. This is the BUG7 protection, structural. */
  it('and they are filtered to that person', () => {
    expect(CODE).toMatch(/\.filter\(\(c: any\) => c\.participantId === p\.id\)/)
  })

  it('the history computation this protected is gone, not fixed twice', () => {
    /**
     * The bite-check caught this gap: I had pinned the SORT's lookup and not the HISTORY's, and
     * the history was the one that rendered "Nobody has checked in yet" over twelve completed
     * sessions. That `history={...}` reduce (building `{sessionNumber, date, people}` from
     * `ci.participantId`, resolved through `nameOfParticipant`) only ever existed to feed
     * GroundChat's non-party history view.
     *
     * ROUND 4, ITEM A STEP 3: that view is retired - a lead who is not a party is told plainly and
     * sent to the board instead (see "a lead who is not one is told plainly", above) - so the
     * computation this test pinned is gone from this file entirely, not merely correct. The bug
     * class it guarded against (a session-history read that resolves names differently from the
     * roster) cannot recur here because the code path does not exist here any more; the resolver
     * itself, `nameOfParticipant`, is still exercised by "who is in this" (`whoIsInThisParties`,
     * `p.id` rather than `ci.participantId` - a person, not a check-in row).
     */
    expect(CODE).not.toContain('const who = nameOfParticipant(ci.participantId)')
    expect(CODE).not.toMatch(/ci\.participantName/)
    expect(CODE).toContain('nameOfParticipant(p.id)')
  })

  /**
   * THE SORT THIS NAMED IS GONE WITH THE FLAT LIST, but the mistake it caught is not tied to it.
   *
   * The original sorted on `participantEmail` - a field the payload has never carried - so it fell
   * through to the row id and looked like it worked. The durable half is the negative: no lookup here
   * may reach for a field that does not exist. Names come from `nameOfParticipant`, which resolves
   * against the roster, and rows now come from the participant object itself.
   */
  it('no name is read from a field the payload does not carry', () => {
    expect(CODE).not.toContain('a.participantEmail')
    expect(CODE).not.toContain('ci.participantEmail')
    expect(CODE).not.toContain('ci.participantName')
  })

  /** A person's row is labelled from their own record, which is stronger than resolving an id. */
  it('and a row is labelled from the participant it belongs to', () => {
    expect(CODE).toContain('{personLabel(p)}')
  })

  /**
   * THE RULE SURVIVES; THE PLACE IT WAS COMPUTED DOES NOT.
   *
   * Two parties through twelve sessions is twenty-four check-ins, and the topic card said "24 of 12
   * sessions done" - counting rows rather than rounds. That card no longer carries a session count
   * at all: the state is in the page header, on both pages, once.
   *
   * The header's count enforces the same rule by a different route - the LOWEST number of distinct
   * completed sessions across the parties - so a round nobody has all finished cannot be counted as
   * done, and it also cannot exceed the total. That is the computation to pin now.
   */
  it('a session is done when everybody has finished it, not per row', () => {
    /* The rule lives in `whichSessionIsThisCheckInOn` now, shared with the roster so the two
       cannot disagree on screen. Asserted by running it, not by where it used to be written. */
    expect(CODE).toMatch(/whichSessionIsThisCheckInOn\(/)
    expect(CODE).toMatch(/c\.participantId === p\.id && c\.status === 'COMPLETED'/)
    expect(whichSessionIsThisCheckInOn([[1, 2, 3], [1]])).toBe(2)
  })

  it('and there is no moment pill in the header (10 Sep 2026): the scenario pill on the next line carries what kind of check-in this is', () => {
    expect(CODE).not.toMatch(/Opened for: \{MOMENT_LABELS/)
  })
})

/** 21 Sep 2026: a released report read "Ready to release" because the page compared `roundNumber` and the server sends `sessionNumber`. */
describe('a round completion is keyed by sessionNumber, the name the server uses', () => {
  it('the page never reads roundNumber', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'GroundAdminPage.tsx'), 'utf8');
    expect(src).not.toMatch(/\broundNumber\b/);
    /*
     * U.10: THE COUNTING MOVED TO lib/session-rows.ts, SO ITS OWN CHECK MOVES WITH IT.
     * `sessionRows` - the thing that used to compare roundCompletions against sessionNumber inline
     * here - is now `buildSessionRows`, shared with the board's "Reports" table. This page no
     * longer contains that comparison at all; the file it moved to still must not use `roundNumber`
     * either, and must still key off `sessionNumber`.
     */
    const sessionRowsSrc = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'lib', 'session-rows.ts'), 'utf8');
    expect(sessionRowsSrc).not.toMatch(/\broundNumber\b/);
    expect(sessionRowsSrc).toMatch(/roundCompletions[\s\S]{0,80}sessionNumber === n/);
  });
});
