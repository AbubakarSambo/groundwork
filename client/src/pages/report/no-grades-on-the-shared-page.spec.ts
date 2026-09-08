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
const REPORT = readFileSync(join(__dirname, 'ReportPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
const MY_RECORD = readFileSync(join(__dirname, '../../components/gw/MyRecord.tsx'), 'utf8')

describe('no grades on the shared page', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(REPORT.length).toBeGreaterThan(5000)
    expect(MY_RECORD.length).toBeGreaterThan(1000)
  })

  it('the shared report does not label how specific a named person was', () => {
    expect(REPORT).not.toContain('specificityLabel')
    expect(REPORT).not.toMatch(/specificity</)
  })

  it('but it still says who is on record and how many sessions they are on', () => {
    /* Participation is a fact about the check-in. Removing the grade must not remove this too. */
    expect(REPORT).toContain('On record')
    expect(REPORT).toMatch(/session\$\{/)
  })

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
    expect(AT_THE_TOP).toContain('What your record can support')
    expect(AT_THE_TOP).toContain('Only you see this')
    /* And the actionable half - the one thing that would make the next session land harder - moved
       with the specificity read it belongs to. */
    const FIVE = readFileSync(
      join(__dirname, '..', '..', 'components', 'gw', 'TheFiveThingsThatMakeItCheckable.tsx'),
      'utf8',
    )
    expect(FIVE).toContain('whatWouldHelp')
    /* The per-session phrase moved to its own file when the session list moved to the Report tab
       and two surfaces needed the same reading. */
    const PHRASE = readFileSync(
      join(__dirname, '..', '..', 'components', 'gw', 'how-checkable-was-that-session.ts'),
      'utf8',
    )
    expect(PHRASE).toContain('specific enough to check')
  })
})
