import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { howCheckable } from './how-checkable-was-that-session'

/**
 * SPECIFICITY AND CONFIDENCE ARE TWO DIFFERENT READS, AND MY RECORD SHOWED THEM AS ONE SHAPE.
 *
 * Her distinction: "Confidence is about the history and the read possible, and specificity is
 * about how well you have given information in each session."
 *
 * The page had them as two matching cards - a row of coloured bars each, no dates, no scale - so
 * neither said which session it was about or what it was a read OF. And it had TWO lists of the
 * same sessions a few inches apart: one with dates and status, one with dates and a way into each
 * session's report. "My record page seems to be doing too much."
 *
 * So: specificity is per session and sits on the session, in words. Confidence stays as one read
 * across the history and says so. The sessions list is one list, the one you can act from.
 */
const read = (...p: string[]) => readFileSync(join(__dirname, ...p), 'utf8')
const RECORD = read('MyRecord.tsx')
/* Both reads moved to the top of the page, above what they summarise. See the two its below. */
const SUPPORT = read('WhatYourRecordCanSupport.tsx')
const FIVE = read('TheFiveThingsThatMakeItCheckable.tsx')
/* The per-session phrase, extracted to its own file when the session list moved to the Report tab
   and two surfaces needed the same reading. */
const PHRASE = read('how-checkable-was-that-session.ts')
const REPORT_TAB = read('SharedReportForAParty.tsx')

describe('my record', () => {
  /**
   * AND THE ONE LIST IS ON REPORT NOW, WHICH IS THE ONLY THING THAT CHANGED.
   *
   * There were two identical lists, here and on the Report tab. I removed the Report one and
   * removed the wrong one: "your sessions on the report page should go to reports." A session's
   * report is a report; My record is what you wrote and what it amounts to.
   *
   * What this file protects is the count. It is still one.
   */
  it('lists the sessions once, not twice', () => {
    expect(RECORD).not.toContain('<Sec title="Sessions on record" />')
    expect(REPORT_TAB).toContain('Your sessions')
    /* And My record keeps none - not the list, and not a line pointing at it. The Report tab is in
       the tab bar; a page does not need to name its neighbours. */
    expect(RECORD).not.toMatch(/mySessions\.map\(/)
    expect(RECORD).not.toContain('are on Report')
  })

  it('puts how checkable a session was on that session', () => {
    expect(REPORT_TAB).toContain('specificityBySession')
    expect(PHRASE).toContain('specific enough to check')
    /*
     * U.9 THIRD REVIEW, ITEM 6: "MOSTLY GENERAL", NOT "LITTLE IN WHAT YOU SAID THAT CAN BE
     * CHECKED". The Report tab's per-session line used to read a different field than the meter
     * on the session itself, and the two could - and did - disagree for the same session ("What
     * you said was specific in places." here, "Mostly general." there). This now reads the same
     * `specificityLevel` the meter reads, banded the same way `whereItSits`
     * (HowSpecificThisSessionWas.tsx) bands it, with matching wording for the low band.
     */
    expect(PHRASE).toContain('What you said was mostly general')
  })

  it('says nothing rather than guessing for a session that has not been read', () => {
    expect(howCheckable(null)).toBe('')
    expect(howCheckable(undefined)).toBe('')
  })

  it('and drops the bars, which were a mark out of a scale nobody could see', () => {
    expect(RECORD).not.toContain('Specificity across sessions')
    expect(RECORD).not.toMatch(/specificity\.scores\.map/)
  })

  /**
   * BOTH READS MOVED TO THE TOP, AND THE DISTINCTION THIS FILE PROTECTS IS WHY THEY ARE TWO CARDS
   * RATHER THAN ONE.
   *
   * They were two cards at the FOOT of this component - below the sessions, below the carry-forward
   * - so a person read everything the page held before reaching the two lines saying what any of it
   * amounted to. And each still said it as a mark on a scale nobody can see: a five-segment bar
   * beside the word "moderate", and a trend with nothing named to compare against.
   *
   * Her distinction is unchanged and is still the reason there are two of them: confidence is about
   * the whole history and the read it makes possible; specificity is about how much was in one
   * session. So one card is about the record, and the other is about a session and names which.
   */
  it('keeps the part that IS about the run, and the part somebody can act on', () => {
    expect(SUPPORT).toContain('Your answers are getting more checkable than session')
    expect(FIVE).toContain('Add one or two next time')
    expect(FIVE).toContain('mostUseful')
  })

  it('and confidence says which of the two reads it is', () => {
    /* One reads the whole record; the other names the single session it read. */
    expect(SUPPORT).toContain('What your record can support')
    expect(FIVE).toMatch(/Session \$\{sessionNumber\} was mostly about the situation around you/)
  })

  it('and neither is a bar or a grade word', () => {
    /*
     * COMMENTS STRIPPED FIRST. Both files explain in prose that they replaced a bar and the word
     * "moderate", so an unstripped read fails on the explanation of the fix - which is the trap
     * `a-guard-that-a-comment-satisfies-is-not-a-guard` names, in the mirror.
     */
    const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const src of [code(SUPPORT), code(FIVE)]) {
      expect(src).not.toMatch(/\[1,2,3,4,5\]\.map/)
      expect(src).not.toContain('moderate')
    }
  })
})
