import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE REPORT LEADS WITH WHAT IS UNRESOLVED. W13-7.
 *
 * From the audit: the board opens with where accounts differ and the question it turns on; the
 * report opened with a paragraph. The board is the better-written document and the report is the
 * product, so a person opening the thing this whole system exists to produce read a summary
 * first and found the gaps three screens down.
 *
 * Nothing was removed. The order changed: where things stand, what is still open, what is
 * agreed, then the full account for anybody who wants it.
 *
 * Checked as source order rather than by rendering, because what is pinned IS the order, and a
 * render test would need a whole report fixture to assert one thing about sequence.
 */
/**
 * THE RULE HOLDS ON THE PAGE PEOPLE OPEN, AND THAT IS WHERE THIS ASSERTS NOW.
 *
 * It read `ReportPage.tsx` - `ReportBody`, which has had no importers for some time. The shared
 * half of a session's report is `TheSessionsReport`, and the order rule is the same one.
 *
 * TWO THINGS CHANGED IN THE TRANSLATION, both worth saying rather than quietly absorbing.
 *
 * Still-open and everyone-agrees are ONE block on the live page - "Where things stand", settled and
 * open as two columns side by side - so the two assertions about their order relative to the prose
 * become one assertion about that block.
 *
 * And "where things stand is first of all" is no longer true, on purpose. The objective comes
 * before it now: what a thing is FOR comes before where it stands, because every line underneath
 * means something different depending on what it was in service of. The shortest true thing on the
 * page is still near the top; it is second rather than first, and that is a decision rather than
 * drift.
 */
const SRC = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheSessionsReport.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Position of a section heading inside the shared-report card. */
const at = (needle: string) => {
  const i = SRC.indexOf(needle)
  expect(i, `${needle} is not in ReportPage any more - this file is asserting an order that no longer exists`).toBeGreaterThan(0)
  return i
}

describe('the order of the shared report', () => {
  it('what is still open, and what everyone agrees, come before the prose', () => {
    /* One block on this page rather than two: settled and open are its two columns. */
    expect(at('label="Where things stand"')).toBeLessThan(at('label="The picture from everybody"'))
  })

  it('and the objective comes before where things stand, which is the one order change', () => {
    /* What a thing is FOR before where it stands: every line underneath means something different
       depending on what it was in service of. Where-things-stand was first of all on the old body;
       it is second here, and that is a decision rather than drift.
       U.9 RE-REVIEW, ITEM A: the label now folds in its former note as one sentence ("What
       everybody said good looks like, and each person's own version of it"), so this matches the
       label's opening words rather than the exact, now-longer, string. */
    expect(at('label="What everybody said good looks like')).toBeLessThan(at('label="Where things stand"'))
  })

  it('the page does not open with the prose either', () => {
    /* The half that was missed last time: the card was reordered, the legend updated, the test
       written - and the page still opened with the same paragraph, because a hero block printed
       the shared picture too. Found by opening the page rather than by the test. Here the finding
       leads, which is one sentence rather than the narrative. */
    expect(at('label="The picture from everybody"')).toBeGreaterThan(at('{finding.text}'))
  })

  it('the prose is still there - this was a reorder, not a deletion', () => {
    expect(SRC).toContain('label="The picture from everybody"')
  })

  /*
   * TWO ASSERTIONS RETIRED RATHER THAN TRANSLATED, and the reason is recorded rather than left as
   * an absence.
   *
   * One checked the hero block for the words "still open". There is no hero block on this page -
   * the finding is the top line, in one sentence, and what is open is a column further down.
   *
   * The other checked that the reading guide no longer claimed the report opens with the prose.
   * That guide is the legend, it lives on the board now, and the-finding-comes-before-the-method
   * asserts it there - including the sentence this one was checking, "leads with what is still
   * unresolved". Asserting it twice against two copies is how the copies drift.
   */
})
