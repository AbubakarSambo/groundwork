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
  it('names the person who has not answered, because that is the actual blocker', () => {
    const { headline } = whatItCanSay(facts())
    expect(headline).toContain('Ada Nwosu has not answered yet')
    expect(headline).toContain('It can say what you said')
  })

  it('and falls back to "one person" where peers are hidden', () => {
    /* A page being private to its reader does not make somebody else's name theirs to know. */
    const { headline } = whatItCanSay(facts({ waitingOn: [] }))
    expect(headline).toContain('one person has not answered yet')
    expect(headline).not.toContain('Ada')
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
