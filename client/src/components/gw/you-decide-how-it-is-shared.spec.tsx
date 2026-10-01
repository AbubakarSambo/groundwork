import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Hafsah, 23 September 2026: "Groundwork does not automatically decide to anonymise. You decide."
 *
 * There was no decision to make. Whether one respondent saw another respondent's name came from
 * `peersVisibleToEachOther`, a check-in-wide setting made at set-up and usually never touched, and
 * this button sent a hundred people whatever that happened to say.
 */
const SEND = readFileSync(join(__dirname, 'SendTheReportToEveryone.tsx'), 'utf8')
const NET = readFileSync(join(__dirname, 'WhatTheNetworkSaid.tsx'), 'utf8')

describe('the organiser chooses what the respondents receive', () => {
  it('offers both, as a real choice and not a checkbox', () => {
    expect(SEND).toMatch(/name="how-it-is-shared"/)
    expect(SEND).toMatch(/type="radio"/)
    expect(SEND).toMatch(/'NAMED'/)
    expect(SEND).toMatch(/'ANONYMOUS'/)
  })

  /* Named is what it did before the choice existed. Preselecting anonymised would be the product
     quietly making the decision it has just been told not to make. */
  it('and starts on named', () => {
    expect(SEND).toMatch(/useState<'NAMED' \| 'ANONYMOUS'>\('NAMED'\)/)
  })

  /* Not "this anonymises the report". It says what it removes and what it cannot. */
  it('and says honestly what anonymised cannot do', () => {
    expect(SEND).toMatch(/cannot take out somebody describing themselves/)
    expect(SEND).toMatch(/Yours stays named/)
  })

  it('and the choice reaches the send', () => {
    expect(SEND).toMatch(/reportsApi\.sendToEveryone\(groundId, how\)/)
  })

  /* So nobody presses it believing they sent one thing and sent the other. */
  it('and the button says which one it is about to do', () => {
    expect(SEND).toMatch(/Send \$\{how === 'ANONYMOUS' \? 'anonymised ' : ''\}to/)
  })

  /*
   * GROUP 3 REVIEW, BATCH B: sessions.jpg has no card for this at all, and a navy button here sat
   * beside the header's own navy "Your check-in" - more than the one navy button a screen gets.
   * The shared `Button kind="secondary"` (white, outlined) replaces the hand-rolled navy
   * `<button style={{ background: 'var(--gw-navy)', ... }}>`.
   */
  it('is a white secondary button, not a second navy one', () => {
    expect(SEND).toMatch(/Button kind="secondary"/)
    expect(SEND).not.toMatch(/background: 'var\(--gw-navy\)'/)
  })
})

describe('a hundred accounts get their own read', () => {
  it('draws every section the API can write', () => {
    for (const s of [
      'Where they want to grow', 'What matters', 'Who they need to reach', 'What they cannot see',
      'What they already have', 'How they choose who to work with', 'What went wrong',
      'How the kinds of organisation differ', 'Where they want different things',
      'Where this could be useful', 'What nobody said',
    ]) expect(NET).toContain(s)
  })

  /* An empty section is a true answer - the model is told to leave it empty rather than fill it -
     so drawing a heading over nothing would turn that honesty back into a hole in the page. */
  it('and draws nothing where a section is empty', () => {
    expect(NET).toMatch(/if \(!rows\?\.length\) return null/)
    expect(NET).toMatch(/if \(!picture \|\| typeof picture !== 'object'\) return null/)
  })

  /* The count is the evidence for the claim next to it. It is never hidden behind a fold. */
  it('and never shows a finding without how many accounts said it', () => {
    expect(NET).toMatch(/function HowMany/)
    expect(NET).toMatch(/\{n\} \{n === 1 \? 'account' : 'accounts'\}/)
  })

  /* A hundred accounts produce long lists, and this platform has already been caught rendering
     fourteen thousand pixels of them. See a-long-list-is-not-a-page. */
  it('and caps every long list', () => {
    expect(NET).toMatch(/import \{ ShowAFew \}/)
  })
})
