import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * THE YARDSTICK REACHES A PARTY WHERE IT CAN BE COMPARED, NOT WHERE IT CAN ONLY BE DISCLOSED.
 *
 * WHAT THIS SPEC USED TO SAY. A party's Setup tab carried a paragraph - "Nothing on this page is
 * yours to change... so that what you are read against is not something you set yourself" - and
 * this file pinned every clause of it, plus the two read-only panels it was apologising for.
 *
 * WHY IT CHANGED. Her instruction, naming the paragraph and both panels: "remove this part on the
 * setup page for zainab". The reasoning in the old spec was sound and the placement was not. A
 * settings tab was the one page where nothing was hers, and what she met there was a paragraph
 * explaining a restriction, followed by two panels that said only that nothing had been set. Three
 * statements about absence and permission before a single fact about her.
 *
 * WHAT MUST STILL BE TRUE, AND IS WHAT THIS FILE NOW GUARDS. Somebody being read against a standard
 * they cannot see is the thing this product is against. So the rule did not move - the surface did.
 * What the lead says success is now reaches a party on My record, beside her own account of the
 * same question, where the two can be read together rather than one being disclosed at her. Losing
 * the paragraph must not be allowed to quietly become losing the yardstick.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PARTY = readFileSync(path.join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')
const MY_RECORD = readFileSync(path.join(__dirname, '../../components/gw/MyRecord.tsx'), 'utf8')
const BAND = readFileSync(path.join(__dirname, '../../components/gw/WhatSuccessLooksLike.tsx'), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The tab's own region, bounded by its braces so it grows with what it is guarding, and the page it draws.
 * 4 November 2026: since Release 1B's switch went, the party's tab is one element, `<YourPeopleAndSetup />`, so its page
 * (YourPeopleAndSetup.tsx) is read with it; the old inline block it replaced no longer exists.
 */
const YOURS = readFileSync(path.join(__dirname, 'YourPeopleAndSetup.tsx'), 'utf8')
const SETTINGS = (() => {
  const i = PARTY.indexOf("{tab === 'settings' && ")
  expect(i).toBeGreaterThan(-1)
  let depth = 0
  for (let j = i; j < PARTY.length; j++) {
    if (PARTY[j] === '{') depth++
    else if (PARTY[j] === '}') {
      depth--
      if (depth === 0) return strip(PARTY.slice(i, j + 1)) + strip(YOURS)
    }
  }
  throw new Error("the settings tab's block never closes")
})()

describe('the setup tab is what is true about you, and nothing else', () => {
  it('no longer opens with a paragraph about what is not yours', () => {
    expect(SETTINGS).not.toMatch(/Nothing on this page is yours to change/)
    expect(SETTINGS).not.toMatch(/not something you set yourself/)
  })

  it('and the two panels that paragraph was apologising for are gone from it', () => {
    expect(SETTINGS).not.toContain('BaselinePanel')
    expect(SETTINGS).not.toContain('StartingPointPanel')
  })

  it('found the region, so an empty slice cannot pass these', () => {
    expect(SETTINGS).toContain('<YourPeopleAndSetup')
    expect(SETTINGS).toContain('MyParticipation')
  })
})

describe('but the yardstick still reaches a party, where it can be compared', () => {
  /**
   * AND "BESIDE HER OWN SESSIONS" IS NOT MY RECORD ANY MORE.
   *
   * This required the band on My record, because that was the page her sessions were on. They are
   * on Report now - "your sessions on the report page should go to reports" - so the sentence this
   * spec was written around no longer describes that page.
   *
   * Where it can actually be compared is where her own account is: `TheSessionsReport` renders it
   * directly under her account on the session's own page, which is a closer reading of this rule
   * than the card ever was. It is also on the board, and on Context where the same copy is
   * published for everybody including her.
   *
   * What must not happen is it reaching only the lead. That is what is asserted.
   */
  it('under her own account, on the session it is read against', () => {
    const SESSIONS_REPORT = readFileSync(
      path.join(__dirname, '..', '..', 'components', 'gw', 'TheSessionsReport.tsx'),
      'utf8',
    )
    expect(strip(SESSIONS_REPORT)).toContain('<WhatSuccessLooksLike')
  })

  it('and on Context, where the same words are published for everybody', () => {
    /*
     * At the foot of what is expected of them, not as a band of its own: the two are one subject and
     * a second heading said they were two. My record keeps no copy and no signpost - the Context tab
     * is in the tab bar.
     */
    const PANEL = strip(readFileSync(
      path.join(__dirname, '..', '..', 'components', 'gw', 'ExpectationsPanel.tsx'), 'utf8',
    ))
    expect(PANEL).toContain('<WhatSuccessLooksLikeFor groundId={groundId} dense />')
    expect(strip(MY_RECORD)).not.toContain('WhatSuccessLooksLikeFor')
  })

  it('carrying what the lead stated, not only what she said herself', () => {
    const code = strip(BAND)
    expect(code).toMatch(/data\.stated/)
    expect(code).toMatch(/data\.definitions/)
  })

  /**
   * The refusals are the design, and they are the first thing a later change would erode: a
   * percentage looks like progress and is a verdict, and "met" is a judgement about the world that
   * no entry in the record can carry - a commitment to do a thing is not the thing being done.
   */
  it('and still issues no verdict: no score, no percentage, no "met"', () => {
    const code = strip(BAND)
    expect(code).not.toMatch(/\bmet\b/i)
    expect(code).not.toMatch(/toFixed|Math\.round\([^)]*100|%<|'%'|`%`/)
    expect(code).not.toMatch(/\bscore\b/i)
  })
})
