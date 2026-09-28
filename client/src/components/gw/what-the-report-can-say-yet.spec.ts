import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { whatItCanSay, type CoverageFacts } from './WhatTheReportCanSayYet'

/**
 * THE PAGE ONLY EVER HAD ONE AXIS, AND SAID IT THREE TIMES.
 *
 * Her diagnosis: "What your record can support" said not much yet; "What was in what you said" said
 * five absences; "Your session reports" said little in it that can be checked. "Three cards, three
 * vocabularies, one verdict." All three were reads of the PERSON.
 *
 * Nothing said what the shared report can and cannot say yet, or how far off a complete one is. That
 * is the second axis, and it is the one that stops the page being a grading sheet - because the
 * reason the picture is thin is usually not the person reading it. It is that somebody else has not
 * answered, and only this says so.
 *
 * NOTHING NEW IS COMPUTED. Every row reads a field the payloads already carry.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = readFileSync(path.join(__dirname, 'WhatTheReportCanSayYet.tsx'), 'utf8')
const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const facts = (o: Partial<CoverageFacts> = {}): CoverageFacts => ({
  iHaveCheckedIn: true,
  answered: 1,
  parties: 2,
  waitingOn: ['Ada Nwosu'],
  corroborated: null,
  documentBackedPct: null,
  roundsFinished: 1,
  ...o,
})

describe('what the report can say so far', () => {
  /**
   * IT NAMED SOMEBODY, AND THAT WAS THE WRONG KIND OF PRECISE.
   *
   * "It cannot compare anything yet, because Ada Nwosu has not answered yet." Read back: "this area
   * is literally about how much context it has from the chats yet you name Ada?"
   *
   * The fault is not privacy - the reader may be perfectly entitled to that name, and this page is
   * their own. It is that naming somebody turns a meter about the report into a remark about a
   * colleague. Every other row counts what the check-in has to work with; that one pointed at a
   * person and said the shortfall was theirs, on a page that refuses to give verdicts about the
   * person actually reading it.
   */
  it('counts who is outstanding and names nobody', () => {
    const { headline } = whatItCanSay(facts())
    expect(headline).toContain('It can say what you said')
    expect(headline).toContain('until one more person answers')
    expect(headline).not.toContain('Ada')
  })

  it('nor anywhere in the rows', () => {
    const { rows } = whatItCanSay(facts())
    for (const r of rows) {
      expect(r.says).not.toContain('Ada')
      expect(r.because ?? '').not.toContain('Ada')
    }
  })

  it('and counts correctly with more than one outstanding', () => {
    const { headline } = whatItCanSay(facts({ parties: 4, answered: 1, waitingOn: ['Ada', 'Bo', 'Cy'] }))
    expect(headline).toContain('until 3 more people answer')
  })

  it('says what is missing rather than only that something is', () => {
    const { rows } = whatItCanSay(facts())
    const blocked = rows.filter(r => !r.can)
    expect(blocked.length).toBeGreaterThan(0)
    for (const r of blocked) expect(r.because).toBeTruthy()
  })

  it('turns rows on as the facts arrive', () => {
    const full = whatItCanSay(facts({
      answered: 2, corroborated: { checked: 3, total: 5 }, documentBackedPct: 40, roundsFinished: 2,
    }))
    expect(full.rows.every(r => r.can)).toBe(true)
    expect(full.headline).toBe('Everything a report needs is here.')
  })

  it('and says nothing has started before the reader has checked in', () => {
    const { headline } = whatItCanSay(facts({ iHaveCheckedIn: false, answered: 0 }))
    expect(headline).toBe('Nothing yet. It starts with your first check-in.')
  })

  it('never uses the word account in what a person reads', () => {
    /* Banned: it means their account of what happened and reads as a login. */
    const shown = code.match(/says: '[^']*'/g) ?? []
    for (const line of shown) expect(line.toLowerCase()).not.toContain('account')
  })
})

/*
 * U.8 FIFTH REVIEW, SECOND PASS: `parties: null` MEANS "MORE THAN ONE, EXACT NUMBER NOT KNOWN" -
 * NEVER A FABRICATED TOTAL.
 *
 * `GroundParticipantPage.tsx` used to fall back to `aTeamReportComes ? 2 : 1` once its own primary
 * source (`sessionProgress.total`) went null at report release - which said "X of 2 have answered"
 * for a real team of three or more, untrue the moment there were more than two people on it.
 * `parties: null` is the honest version: it says something true instead of a guessed total.
 */
const knownTeamOfUnknownSize = (o: Partial<CoverageFacts> = {}): CoverageFacts => ({
  iHaveCheckedIn: true,
  answered: 1,
  parties: null,
  waitingOn: [],
  corroborated: null,
  documentBackedPct: null,
  roundsFinished: 1,
  ...o,
})

describe('parties: null - a team exists but the exact count is not known', () => {
  it('never states a number of parties, in the headline or any row', () => {
    const { rows, headline } = whatItCanSay(knownTeamOfUnknownSize())
    expect(headline).not.toMatch(/of \d+ have answered/)
    expect(headline).not.toMatch(/\d+ more (person|people)/)
    for (const r of rows) expect(r.because ?? '').not.toMatch(/of \d+ have answered/)
  })

  it('says something true instead - the team\'s report is already out', () => {
    const { rows } = whatItCanSay(knownTeamOfUnknownSize())
    const differences = rows.find(r => r.short === 'differences')!
    expect(differences.because).toBe('The team’s report is already out.')
  })

  it('can show differences, since an unknown party count only ever means the round has completed', () => {
    const { rows } = whatItCanSay(knownTeamOfUnknownSize())
    const differences = rows.find(r => r.short === 'differences')!
    expect(differences.can).toBe(true)
  })

  it('never claims to compare against a specific outstanding count', () => {
    const { headline } = whatItCanSay(knownTeamOfUnknownSize({ answered: 0 }))
    expect(headline).not.toContain('until')
  })

  it('a genuinely solo check-in still gets its true count of one, not null', () => {
    const { rows } = whatItCanSay(knownTeamOfUnknownSize({ parties: 1, answered: 1 }))
    const differences = rows.find(r => r.short === 'differences')!
    expect(differences.because).toBe('Nobody else is on this check-in yet')
    expect(differences.can).toBe(false)
  })
})
