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
  it('the panel has no input, no textarea and no save', () => {
    expect(CODE).not.toMatch(/<textarea|<input/)
    expect(CODE).not.toMatch(/stateMyObjective|acceptMyObjective|proposeObjective/)
  })

  it('and it says where a disagreement goes instead', () => {
    /** Without this, a read-only expectation reads as something you are stuck with. */
    expect(PANEL).toMatch(/say so in your check-in and it is probed and recorded there/)
  })

  it('and says everyone sees the same list', () => {
    expect(PANEL).toMatch(/Everyone in this check-in sees the same list/)
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
    expect(PANEL).not.toMatch(/failed|neglected|should have/i)
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

describe('both roles get it', () => {
  for (const page of ['../../pages/grounds/GroundAdminPage.tsx', '../../pages/grounds/GroundParticipantPage.tsx']) {
    it(`${page.split('/').pop()} renders the panel on the context tab`, () => {
      const src = readFileSync(join(__dirname, page), 'utf8')
      expect(src).toContain('<ExpectationsPanel')
      expect(src).toContain("viewerUserId={user?.id}")
    })
  }
})
