import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * "I NEED SPECIFICITY TO SHOW SOMEHOW."
 *
 * It was showing as a five-segment bar and the word "moderate", three screens down. That is a mark
 * out of a scale nobody can see, and the previous version of exactly that was already removed once:
 * `specificity-belongs-to-the-person.spec.ts` killed "Overall quality label: low" as "a verdict on a
 * person's writing, handed to them with nothing to do about it".
 *
 * The engine never graded anybody. It reads five separate things off a session and stores them per
 * check-in as `specificityDimensions` - delivery, evidence, enablement, coverage, commitment - and
 * no screen had ever shown them. The itemised, honest read existed the whole time and the product
 * was averaging it into one word and printing the word.
 *
 * WHAT MAY NOT COME BACK, and both are guarded here because both have come back once already: a bar
 * out of five, and a grade word standing on its own.
 *
 * THE FACE IS ABOUT THE RECORD, NEVER THE PERSON. That is the line that makes one allowable at all.
 * "What your record can support" is a statement about an artefact and arrives with the five things
 * that would change it; a face on somebody's writing is the verdict that was removed, illustrated.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const read = (f: string) => readFileSync(path.join(__dirname, f), 'utf8')
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const SUPPORT = read('WhatYourRecordCanSupport.tsx')
const PARTY = read('../../pages/grounds/GroundParticipantPage.tsx')
const LEAD = read('../../pages/grounds/GroundAdminPage.tsx')

/* THE FIVE THINGS ARE GONE FROM MY WORK (Hafsah, 24 November 2026): "Your focus this week" and the "Check-in quality" row in How
   you're performing already say what would make the next check-in count for more, so the five-things list and its file went, and
   the checks on its wording with it. What may not come back is guarded below: a bar out of five, or a grade word on its own. */
describe('what the record can support', () => {
  it('is a sentence, and no longer a face', () => {
    /*
     * THE FACE IS GONE. It was the only emoji on the page, and a sad one, and it was the single most
     * prominent thing on a page about somebody's own work. The argument that it described the record
     * rather than the writer held right up until it was that big.
     */
    /* The heading said "Where your record stands" until the vocabulary pass: "record" is the
       filing-cabinet word, and this card is about what somebody has said, not a file kept on
       them. The rule here is the face, not the wording - but the heading has to be asserted as
       something, or the card can lose its heading and still pass. */
    expect(code(SUPPORT)).toContain('Where what you have shared stands')
    expect(code(SUPPORT)).not.toContain('Where your record stands')
    expect(code(SUPPORT)).not.toMatch(/🙂|😐|🙁/)
    expect(code(SUPPORT)).not.toMatch(/\[1,2,3,4,5\]\.map/)
  })

  it('says the direction without an arrow, naming what it compared against', () => {
    /* a-trajectory-is-not-a-score: "no score, no tier, no arrow". */
    expect(code(SUPPORT)).toContain('more checkable than check-in ${comparedWith}')
    expect(code(SUPPORT)).not.toMatch(/[↑↓]/)
  })

  it('and refuses a direction under three sessions', () => {
    /* Telling somebody their record is falling off two numbers is a verdict dressed as an
       observation - the server refuses to compute one, and this refuses to show one. */
    expect(SUPPORT).toContain('done.length >= 3')
  })

  it('is a bar per session, labelled with the session number', () => {
    /*
     * THE BAR CAME BACK. "The specificity bar etc was good, simple and visual." It was removed for
     * a different fault - a row of coloured bars with no session numbers and no scale said nothing
     * about which session was which - and that is a labelling problem, not a reason to go back to
     * words only. So: numbered underneath, and a sentence saying what the height means.
     *
     * The count of finished sessions is gone with it. "1 of 4 done" is progress through a calendar,
     * and this row is about how much each session can support.
     */
    expect(SUPPORT).toContain('checkable')
    expect(SUPPORT).toContain('Fuller means that session was easier for someone else to check')
    /* They fill upward inside a fixed box, so "taller" described nothing on the screen. */
    expect(code(SUPPORT)).not.toContain('Taller means')
    /* And a low score is not an error: brown-red at 40% read as broken rather than thin. */
    expect(code(SUPPORT)).not.toContain("'var(--gw-clay)'")
    expect(code(SUPPORT)).not.toContain('of {dots.length} done')
  })

  it('and covers the whole run, not the rows that happen to exist', () => {
    /* It read "Session 1 of 2" under a header saying "Session 2 of 4", because a check-in row only
       exists once a session has been opened. Two counters disagreeing about one run is worse than
       having neither. */
    expect(SUPPORT).toContain('Math.max(totalSessions ?? 0, sessions.length)')
  })

  it('and does not say a second time that nobody else sees it', () => {
    /*
     * The check-in header says it on every tab of this page: "Just yours - only you see this until
     * the report releases." A card repeating it is the same absence stated twice, close together -
     * the pattern this page has now been cleared of three times.
     */
    expect(code(SUPPORT)).not.toContain('Only you see this')
  })
})

/**
 * REVIEW ROUND 3, "YOUR WORK" REBUILD: BOTH CARDS MOVED INTO THE SHARED `YourWork` COMPONENT
 * (components/gw/checkin/YourWork.tsx), which both pages now call for My work/My record instead
 * of laying the same cards out twice. "Both views show the same two cards" still holds - more
 * strongly than before, since there is now exactly one copy of the layout, not two that could
 * drift apart - checked here as both pages calling `YourWork`, and `YourWork` itself carrying
 * both cards.
 */
describe('and both views of a check-in show the same two cards', () => {
  const YOUR_WORK = read('checkin/YourWork.tsx')

  it('the card lives in the one shared component, and the five-things list is not drawn (Hafsah, 24 November 2026)', () => {
    expect(YOUR_WORK).toContain('<WhatYourRecordCanSupport')
    expect(YOUR_WORK).not.toContain('TheFiveThingsThatMakeItCheckable')
  })

  /* the-two-views-are-a-pair: what a tab contains may differ by role; a person being a lead on one
     check-in and a party on another must not have to relearn the page. */
  it('the party view', () => {
    expect(PARTY).toContain('<YourWork')
  })

  it('and the view that runs the check-in', () => {
    expect(LEAD).toContain('<YourWork')
  })
})
