import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A GRADE ON A NAMED COLLEAGUE, ON THE PAGE EVERYONE READS.
 *
 * The "On record" list carried a colour-coded badge beside each person's name - green for high,
 * blue for moderate, amber for low. Observed in the running product it read:
 *
 *   ON RECORD   Lena Lead   1 session   moderate specificity
 *               Renewals owner   1 session   moderate specificity
 *
 * The only thing explaining it was a `title` attribute, which most people never see and no screen
 * reader announces by default. What it says on the page is: here is how well your colleague did.
 *
 * The report's own promise is that it shows where accounts agree or differ and never anybody's raw
 * answers. How concrete one person was is neither of those - it is an assessment of a person,
 * published to the people they work with.
 *
 * Nothing is lost. Each person keeps their own specificity in My record, privately, written as
 * something to act on rather than a mark their colleagues can read. Who checked in and how many
 * sessions they are on stays: that is participation, not judgement.
 */
/**
 * THE SHARED PAGES PEOPLE OPEN, RATHER THAN THE ONE THAT NO LONGER HAS IMPORTERS.
 *
 * This read `ReportPage.tsx`, where the On-record list was when the badge came off it. The shared
 * surfaces are the session report's lower half, a party's report view, and the board - so the rule
 * is checked against all three, which is stronger than checking it against one. A grade appearing
 * on any of them is the failure this file exists to catch.
 */
const strip = (t: string) => t
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
const SHARED: Record<string, string> = {
  'the session report': strip(readFileSync(join(__dirname, '../../components/gw/TheSessionsReport.tsx'), 'utf8')),
  "a party's report": strip(readFileSync(join(__dirname, '../../components/gw/SharedReportForAParty.tsx'), 'utf8')),
  'the board': strip(readFileSync(join(__dirname, '../board/BoardPage.tsx'), 'utf8')),
}
const MY_RECORD = readFileSync(join(__dirname, '../../components/gw/MyRecord.tsx'), 'utf8')

describe('no grades on the shared page', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    for (const [name, src] of Object.entries(SHARED)) {
      expect(src.length, `${name} is empty`).toBeGreaterThan(3000)
    }
    expect(MY_RECORD.length).toBeGreaterThan(1000)
  })

  it('no shared page labels how specific a named person was', () => {
    for (const [name, src] of Object.entries(SHARED)) {
      expect(src, `${name} carries a specificity label`).not.toContain('specificityLabel')
      expect(src, `${name} carries a specificity label`).not.toMatch(/specificity</)
    }
  })

  /*
   * THE HALF THIS FILE NO LONGER CHECKS, AND WHERE IT WENT.
   *
   * "But it still says who is on record and how many sessions they are on" read the On-record list
   * in the body, which nothing imports. Participation is still shown, on the reveal row, and
   * `the-reveal-row-names-who-you-are-waiting-on` asserts it there in more detail than this ever
   * did - it names people rather than a count, says which one is you, and refuses to count somebody
   * who was never going to answer. Checking the same thing in two places is how two copies drift.
   */

  it('and the person still gets their own specificity, privately', () => {
    /*
     * If this ever goes, the grade was not moved anywhere - it was just deleted.
     *
     * It moved twice. First off the shared page and onto the person's own record, which is what
     * this file is about. Then off a card of its own and onto the session it describes: specificity
     * is a fact about ONE session, and a row of coloured bars with no dates said nothing about
     * which session was which. What is left under a heading here is the part that IS about the run
     * - the trend, and the one thing that would make the next session land harder.
     */
    /*
     * IT MOVED A THIRD TIME - to the top of the page, in sentences. What this file guards is that
     * the read still reaches the person it is about, not which component holds it, so it reads the
     * card that holds it now.
     */
    const AT_THE_TOP = readFileSync(
      join(__dirname, '..', '..', 'components', 'gw', 'WhatYourRecordCanSupport.tsx'),
      'utf8',
    )
    expect(AT_THE_TOP).toContain('Where what you have shared stands')
    /* And the read itself, which is the point: how specific each session was, in bars a person can
       act on because the sentence under them names what fills one. */
    expect(AT_THE_TOP).toContain('How specific each check-in was')
    /* And the actionable half - the one thing that would make the next session land harder - is "Your focus this week" on the
       person's own My work, beside the "Check-in quality" row (the five-things list that said it a third time went, Hafsah,
       24 November 2026). */
    const MY_WORK = readFileSync(join(__dirname, '..', 'grounds', 'MyWorkPage.tsx'), 'utf8')
    expect(MY_WORK).toContain('focus this week')
    /* The per-session phrase moved to its own file when the session list moved to the Report tab
       and two surfaces needed the same reading. */
    const PHRASE = readFileSync(
      join(__dirname, '..', '..', 'components', 'gw', 'how-checkable-was-that-session.ts'),
      'utf8',
    )
    expect(PHRASE).toContain('specific enough to check')
  })
})
