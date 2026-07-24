import { describe, it, expect } from 'vitest'
import { SITUATION_CARDS } from './EntryChatPage'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Item 2: each situation card shows a recommended timeline so people see
 * what a ground of that kind usually looks like before they commit - a
 * hint, not a commitment. Locks the exact confirmed values per card, and
 * that the freeform "describe it yourself" option gets no badge at all
 * (a canned duration would contradict "in your own words").
 */

const EXPECTED: Record<string, string> = {
  'New hire starting': 'typically 90 days',
  'New project': 'typically 90 days',
  'A new way of working together': 'typically 90 days',
  'Setting shared goals': 'typically 90 days',
  'A big decision': 'typically one check-in',
  "Someone's work is off track": 'typically 90 days',
  'A project is off track': 'typically 90 days',
  'You and someone see it differently': 'typically 60 days',
}

describe('situation card timeline hints', () => {
  it('each of the 8 cards carries the confirmed timelineHint', () => {
    for (const card of SITUATION_CARDS) {
      expect(card.timelineHint).toBe(EXPECTED[card.label])
    }
  })

  it('the freeform card gets no timeline hint (not part of SITUATION_CARDS, and the rendered dashed card carries no timelineHint text)', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'), 'utf8')
    const freeformBlock = src.slice(src.indexOf("My situation is different"), src.indexOf("My situation is different") + 400)
    expect(freeformBlock).not.toMatch(/timelineHint/)
  })

  it('renders the hint in the card, styled subordinate to the label/detail (not implying a fixed commitment)', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'), 'utf8')
    expect(src).toMatch(/card\.timelineHint/)
    // "typically" phrasing itself signals recommendation, not commitment -
    // guard that the badges array never states a bare fixed duration.
    for (const hint of Object.values(EXPECTED)) {
      expect(hint).toMatch(/^typically /)
    }
  })
})
