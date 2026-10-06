import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * EXPECTATIONS ARE PUBLISHED, AND SHOWN MEANS SHOWN. GW-EXP-2.
 *
 * Slice 1 made the lead's check-in ask what they expect of each person, and whether that person knows,
 * and wrote both down. This is the half that puts them where people can read them - which is not a
 * display detail: a private expectation cannot make anybody aware of anything, so publishing IS the
 * mechanism that closes the founding failure.
 *
 *     "I was measured on a queue and judged on judgement, and only one of those was said."
 *
 * WHAT MUST HOLD:
 *  1. No control. One person states expectations; a party neither agrees to nor rewrites theirs, and
 *     disagreement goes through the chat where it is probed.
 *  2. The awareness line is shown to the person it is about. Hiding "you were never told" from the
 *     person who was not told would defeat the whole thing.
 *  3. `seenBySubject` flips only when THIS view renders THEIR OWN row. My first attempt did it on the
 *     ground fetch, which happens from every tab - so it would have marked an expectation seen for
 *     somebody who never opened this view. A guard on the read path caught it.
 */
const PANEL = readFileSync(join(__dirname, 'ExpectationsPanel.tsx'), 'utf8')
const CODE = PANEL.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('nobody edits an expectation here', () => {
  it('nothing here writes the expectation itself', () => {
    expect(CODE).not.toMatch(/<textarea/)
    expect(CODE).not.toMatch(/stateMyObjective|acceptMyObjective|proposeObjective/)
  })

  /**
   * THE ONE INPUT THIS FILE IS ALLOWED, AND WHY THE RULE HAD TO GET MORE PRECISE RATHER THAN LOOSER.
   *
   * The rule was "no input in this file", which is a good proxy for "nobody edits an expectation
   * here" right up until something on the row is legitimately writable. A REFERENCE expectation
   * carries what a ticket said when somebody looked, and somebody has to be able to say they just
   * looked - otherwise the state is captured once and shown as current forever, which is the whole
   * thing a pointer exists to prevent.
   *
   * That write does not touch the expectation. It records an observation about a thing somewhere
   * else. So the rule becomes what it always meant: the only mutation in this file is the
   * last-looked stamp, and no field of the expectation is ever bound to a control.
   */
  it('its only write is somebody saying they just looked', () => {
    const mutations = CODE.match(/groundsApi\.\w+/g) ?? []
    expect(mutations.length).toBeGreaterThan(0)
    for (const m of mutations) {
      expect(['groundsApi.markExpectationLookedAt', 'groundsApi.markMyExpectationShown']).toContain(m)
    }
  })

  it('and no control is ever bound to the expectation’s own words', () => {
    // An input whose value is o.text, o.kind or o.dueSaid is an edit box for the expectation,
    // whatever it is labelled.
    expect(CODE).not.toMatch(/value=\{o\.(text|kind|check|dueSaid|dueKind)\}/)
  })

  it('and it says where a disagreement goes instead', () => {
    /**
     * Without this, a read-only expectation reads as something you are stuck with.
     *
     * WORDING UPDATED (group 3's review, request batch A, fault 6): "say so in your check-in: it is
     * probed there and goes on the record" joined two sentences with a colon and used "probed",
     * which is work jargon nobody reading their own expectations would use. Now two plain sentences.
     */
    expect(PANEL).toMatch(/say so in your check-in\.\s+You will be asked more about it there, and it will go on the record\./)
  })

  it('and says everyone sees the same list', () => {
    expect(PANEL).toMatch(/Everyone sees the same list/)
  })
})

describe('the awareness state is visible, including to the person it is about', () => {
  it('all four states are handled and NOT_ASKED says nothing', () => {
    expect(CODE).toMatch(/case 'TOLD'/)
    expect(CODE).toMatch(/case 'NOT_TOLD'/)
    /**
     * Asserted on what the branch RETURNS, not on the case label. The first version checked the label
     * existed, which stayed true when I broke the body to test it - a guard that cannot fail.
     */
    expect(CODE).toMatch(/case 'UNSURE':[\s\S]{0,140}?not sure whether this has been said/)
    /** The default branch returns null: never imply an answer to a question nobody asked. */
    expect(CODE).toMatch(/default:[\s\S]{0,80}?return null/)
  })

  it('an unsaid expectation is stated plainly, not as a failing', () => {
    expect(PANEL).toMatch(/Not yet said directly/)
    /**
     * `CODE`, NOT `PANEL`, and the difference is the whole point of this line. This is a rule about
     * what a PERSON READS - nobody is told they failed at something nobody told them. `PANEL` is the
     * raw file, so it also scans the explanatory comments, and a comment explaining why a sentence
     * must not read as blame contains the very words it forbids. The stripped copy was already in
     * this file, two lines up; this assertion just reached for the wrong one.
     */
    expect(CODE).not.toMatch(/failed|neglected|should have/i)
  })
})

describe('shown means shown', () => {
  it('the flip is fired from this view, once', () => {
    expect(CODE).toContain('markMyExpectationShown')
    expect(CODE).toMatch(/fired\.current/)
  })

  it('and only for the viewer’s own row', () => {
    expect(CODE).toMatch(/p\.userId === viewerUserId/)
    expect(CODE).toMatch(/if \(!mine \|\| mine\.objective\?\.seenBySubject\) return/)
  })
})

/**
 * BOTH ROLES GET IT, AND NOW THAT IS STRUCTURAL RATHER THAN CHECKED TWICE.
 *
 * This used to read both page files and assert each rendered the panel - which is the honest test
 * of a page assembled twice, and which passed happily while the two copies drifted into different
 * band orders around it. The pages now render one ContextPage, so "both roles get it" is a fact
 * about one file plus the fact that neither page assembles its own.
 */
describe('both roles get it', () => {
  it('the one context page renders the person cards, and they render the panel', () => {
    const src = readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8')
    expect(src).toContain('<EachPerson')
    expect(src).toContain('viewerUserId={viewerUserId}')
    const card = readFileSync(join(__dirname, 'EachPerson.tsx'), 'utf8')
    expect(card).toContain('<ExpectationsPanel')
  })

  for (const page of ['../../pages/grounds/GroundAdminPage.tsx', '../../pages/grounds/GroundParticipantPage.tsx']) {
    it(`${page.split('/').pop()} renders it through the one context page`, () => {
      const src = readFileSync(join(__dirname, page), 'utf8')
      expect(src).toContain('<ContextPage')
      expect(src).toContain('viewerUserId={user?.id}')
      // Neither page may assemble its own version of the tab again.
      expect(src).not.toContain('<ExpectationsPanel')
      expect(src).not.toContain('<EachPerson')
    })
  }
})

/**
 * A PAGE ABOUT YOUR OWN WORK HAS TO ADDRESS YOU.
 *
 * Every line under an expectation referred to a third person - "they have not said what doing well
 * looks like to them" - directly beneath a heading reading "You". So the one screen a person reads
 * about themselves talked about them as though they were not in the room, twice per page.
 *
 * It is invisible in the source, where "they" is perfectly sensible prose about a participant. It is
 * unmissable on the rendered row. That is the whole lesson, and this is the cheapest way to hold it.
 */
describe('it speaks to the person whose row it is', () => {
  it('the alignment line knows whose row it is on', () => {
    expect(CODE).toMatch(/function alignmentLine\(\s*o: NonNullable<Objective>,[\s\S]{0,600}isMine: boolean,/)
    expect(CODE).toContain('alignmentLine(o, isMine)')
  })

  it('and says "you" rather than "they" on your own', () => {
    for (const mine of [
      'This matches what you said doing well looks like',
      'You described doing well differently',
      'You have not said what doing well looks like to you yet',
    ]) {
      expect(PANEL).toContain(mine)
    }
  })

  /**
   * The failure mode is a third-person line with no first-person twin, so the rule is about PAIRS:
   * anything saying "they" about the subject must have a "you" beside it.
   */
  it('every third-person line about the subject has a first-person twin', () => {
    const theyLines = [
      'This matches what they said doing well looks like',
      'They described doing well differently',
      'They have not said what doing well looks like to them yet',
    ]
    for (const line of theyLines) {
      expect(PANEL).toContain(line)
      const i = PANEL.indexOf(line)
      // The isMine ternary that chooses it sits within the same returned object.
      expect(PANEL.slice(Math.max(0, i - 300), i + line.length)).toContain('isMine')
    }
  })
})

/**
 * A LINK SHOWS ITS NAME, NOT ITS ADDRESS. The row rendered
 * `tracked in https://tracker.example/OPS-418  I just looked` - a raw URL running most of the width
 * with the action butted against its end, so the two read as one long link.
 */
describe('a tracked ticket reads as a name', () => {
  it('shortens the address rather than printing it whole', () => {
    expect(CODE).toContain('shortUrl(url)')
    expect(CODE).not.toMatch(/>\{url\}</)
  })

  it('and keeps the whole address reachable', () => {
    expect(CODE).toMatch(/href=\{url\}[\s\S]{0,120}title=\{url\}/)
  })
})
