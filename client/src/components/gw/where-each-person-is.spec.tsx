import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhereEachPersonIs, type Row } from './where-each-person-is'

/**
 * RE-REVIEW, 30 SEPTEMBER: two defects on "The team today".
 *
 * (a) A "Nothing to do" tag sat beside Amani and Baraka while the same board told the reader,
 * three sections down, "Amani Wekesa has been waiting 2 days on you for the price list." The
 * `reason` itself is the engine's own classification, not changed here - but a row already flagged
 * `waitingOnReader` (computed on the board from its own "Waiting on" handoffs) now reads "Waiting
 * on you" instead of contradicting that sentence.
 *
 * (b) "0 of 4" stood alone as a bare fragment above "Baraka Mwangi has checked in...". It now reads
 * what the number counts, as a sentence: "Baraka Mwangi has none of their 4 shops in Westlands
 * yet."
 */
const row = (overrides: Partial<Row>): Row => ({
  participantId: 'p-1',
  who: 'Baraka Mwangi',
  target: null,
  count: 0,
  reason: 'nothing to do',
  says: 'Baraka Mwangi has checked in.',
  ask: null,
  ...overrides,
})

describe('WhereEachPersonIs: the tag never contradicts the "Waiting on" section', () => {
  it('reads "Nothing to do" when nobody is waiting on the reader', () => {
    render(<WhereEachPersonIs rows={[row({})]} />)
    expect(screen.getByText('Nothing to do')).toBeTruthy()
    expect(screen.queryByText('Waiting on you')).toBeNull()
  })

  it('reads "Waiting on you" instead, when this person is waiting on the reader for something', () => {
    render(<WhereEachPersonIs rows={[row({ waitingOnReader: true })]} />)
    expect(screen.getByText('Waiting on you')).toBeTruthy()
    expect(screen.queryByText('Nothing to do')).toBeNull()
  })

  it('leaves every other reason exactly as the engine sent it, even if waitingOnReader is somehow true', () => {
    render(<WhereEachPersonIs rows={[row({ reason: 'has not answered', waitingOnReader: true })]} />)
    expect(screen.getByText('Has not answered')).toBeTruthy()
    expect(screen.queryByText('Waiting on you')).toBeNull()
  })
})

describe('WhereEachPersonIs: a count reads as a sentence, not a bare "0 of 4"', () => {
  it('names what the number counts, from the matching objective\'s own name', () => {
    render(<WhereEachPersonIs rows={[row({ target: 4, count: 0, targetName: 'shops in Westlands' })]} />)
    expect(screen.getByText('Baraka Mwangi has none of their 4 shops in Westlands yet.')).toBeTruthy()
    expect(screen.queryByText('0 of 4')).toBeNull()
  })

  it('says "so far", not "yet", once the count is more than zero', () => {
    render(<WhereEachPersonIs rows={[row({ who: 'Aisha Otieno', target: 5, count: 3, targetName: 'shops in Kilimani' })]} />)
    expect(screen.getByText('Aisha Otieno has 3 of the 5 shops in Kilimani so far.')).toBeTruthy()
  })

  it('falls back to a plain "target"/"targets" when no objective name is served', () => {
    render(<WhereEachPersonIs rows={[row({ target: 1, count: 0 })]} />)
    expect(screen.getByText('Baraka Mwangi has none of their 1 target yet.')).toBeTruthy()
  })
})

/**
 * REQUEST 85: SOMEONE AN ADMIN DID NOT LET IN. The row's own sentence is enough - no chasing (ask
 * is always null for this reason, so the ask/finding line never appears) and no label (the reason
 * tag is left off entirely, rather than drawing a tag with an empty face).
 */
describe('WhereEachPersonIs: someone an admin did not let in', () => {
  it('shows the row’s own sentence, with no tag and nothing to chase', () => {
    render(<WhereEachPersonIs rows={[row({
      who: 'Faraji Odhiambo',
      reason: 'not let in',
      says: 'Faraji Odhiambo was not let in by Juma Mwangi, so there is nobody to ask.',
      ask: null,
    })]} />)
    expect(screen.getByText('Faraji Odhiambo was not let in by Juma Mwangi, so there is nobody to ask.')).toBeTruthy()
    for (const label of ['Has not answered', 'Stuck and not chasing', 'Behind the pace', 'Nothing checkable', 'Nothing to do', 'Waiting on you']) {
      expect(screen.queryByText(label)).toBeNull()
    }
  })
})
