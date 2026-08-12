import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

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
 *  1. "its lead runs this ground." - a lowercase sentence fragment, because the banner
 *     read `lead.email` and the API NULLS that field for exactly the viewers who see this
 *     banner. The name was in the payload the whole time.
 *  2. Twenty-four check-in cards in no order at all: "Session 4, Session 1, Session 1,
 *     Session 4, ..."
 *  3. "24 of 12 sessions done" - counting rows, where a row is one person's check-in.
 *  4. "Starting" in a status-shaped pill on a ground with every session finished.
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
    // Her design: "the first thing you land on ... be the chat".
    expect(CODE).toMatch(/useState<Tab>\('chat'\)/)
    expect(CODE).toMatch(/\['chat', 'checkins'/)
  })

  it('the check-in list keeps its own tab rather than being replaced', () => {
    // A lead scanning twelve sessions for who has not checked in wants the list. That is
    // a different question from reading what was said.
    expect(CODE).toMatch(/checkins: 'Check-ins'/)
  })
})

describe('a lead who is a party gets the real chat', () => {
  it('the flag keys on being a party, not on being the lead', () => {
    /**
     * HER CORRECTION. Step 6 of setup offers "I am a party. Let's begin." A lead who
     * takes it has their own check-ins and must get the conversation - keying this on
     * `isInitiator` would have given the most common kind of lead a read-only page about
     * a ground they are actually in.
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
    expect(CODE).toMatch(/'The lead of this ground'/)
    expect(CODE).not.toMatch(/'its lead'/)
  })

  it('the check-in rows are sorted, newest session first', () => {
    expect(CODE).toMatch(/\(b\.sessionNumber \?\? 0\) - \(a\.sessionNumber \?\? 0\)/)
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

  it('and the name in that sort comes from a real field', () => {
    // The first version sorted on `participantEmail`, which the payload has never
    // carried, so it silently fell through to the row id and looked like it worked.
    expect(CODE).toContain('nameOfParticipant(a.participantId)')
    expect(CODE).not.toContain('a.participantEmail')
  })

  it('a session is done when everybody has finished it, not per row', () => {
    // Two parties through twelve sessions is twenty-four check-ins, and the card said
    // "24 of 12 sessions done".
    expect(CODE).toMatch(/new Set\(all\.map\(c => c\.sessionNumber \?\? 1\)\)/)
    expect(CODE).toMatch(/\.every\(c => c\.status === 'COMPLETED'\)/)
  })

  it('and the moment pill says it is a moment', () => {
    // A small pill under the title next to a green dot is where every product puts a
    // status, so "Starting" read as one on a finished ground.
    expect(CODE).toMatch(/Opened for: \{MOMENT_LABELS/)
  })
})
