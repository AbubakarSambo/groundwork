import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { whichSessionIsThisCheckInOn } from '@/lib/which-session-are-we-on'
import { groundTabs } from './ground-tabs'

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
  it('GroundChat is mounted', () => {
    expect(CODE).toContain('<GroundChat')
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
     */
    expect(CODE).toMatch(/viewerIsParty=\{\(ground\.participants \?\? \[\]\)\.some\(\(p: any\) => p\.userId === user\?\.id\)\}/)
  })

  it('and a lead who is not one gets the history, not somebody else\'s words', () => {
    // The wall. There is no version of this where a lead reads a participant's turns.
    expect(CODE).toContain('history={')
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

  it('and the fallback is a whole phrase, so the sentence still reads', () => {
    expect(CODE).toMatch(/'The lead here'/)
    expect(CODE).not.toMatch(/'its lead'/)
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

  it('the history resolves its names the same way', () => {
    /**
     * The bite-check caught this gap: I had pinned the SORT's lookup and not the
     * HISTORY's, and the history was the one that rendered "Nobody has checked in yet"
     * over twelve completed sessions. Two callers, one mistake, one assertion.
     */
    expect(CODE).toContain('const who = nameOfParticipant(ci.participantId)')
    expect(CODE).not.toMatch(/ci\.participantName/)
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
    expect(src).toMatch(/roundCompletions[\s\S]{0,80}sessionNumber === n/);
  });
});
