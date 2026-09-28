import { describe, it, expect } from 'vitest'
import { tileSentence } from './TheSessionsReport'

/**
 * U.9 THIRD REVIEW, ITEM 2: A TILE IS A SENTENCE, NOT A LABEL, A FIGURE AND A FRAGMENT.
 *
 * Walked live, the "At a glance" row read "Differences / 1. / still open, as the written report
 * reads it", "Movement / Nothing yet. / 2 targets set, and no round has closed to measure from.",
 * "Blockers / 1. / The discount decision." and "How much was said / 15% documented. / Of what was
 * said is anchored to a document." - a label, a figure and a fragment, stacked as three pieces
 * rather than said as one thing. `tileSentence` composes the same `label`, `value` and `sub` the
 * server already sends (`atAGlanceTiles`, api's what-this-session-holds.ts) into full sentences,
 * with small counts as words, matching the rest of the product.
 */
describe('an at-a-glance tile reads as full sentences, not stacked pieces', () => {
  it('Differences, with the thing itself named', () => {
    expect(tileSentence({ label: 'Differences', value: '1', sub: 'The main obstacle to signing new shops' }))
      .toBe('People see one thing differently. The main obstacle to signing new shops is seen differently.')
  })

  it('Differences, with only the generic count', () => {
    expect(tileSentence({ label: 'Differences', value: '2', sub: 'still open, as the written report reads it' }))
      .toBe('People see two things differently. Still open, as the written report reads it.')
  })

  it('Movement, targets set but no round closed yet', () => {
    expect(tileSentence({ label: 'Movement', value: 'Nothing yet', sub: '2 targets set, and no round has closed to measure from' }))
      .toBe('Nothing has moved yet. Two targets are set, and no session has closed to measure them against.')
  })

  it('Movement, one target moved', () => {
    expect(tileSentence({ label: 'Movement', value: '+1', sub: 'targets moved this session' }))
      .toBe('One target moved this session.')
  })

  it('Blockers, with the thing itself named', () => {
    expect(tileSentence({ label: 'Blockers', value: '1', sub: 'The discount decision' }))
      .toBe('One thing is blocking work, the discount decision.')
  })

  it('Blockers, none named', () => {
    expect(tileSentence({ label: 'Blockers', value: 'None', sub: 'nobody named anything holding work up' }))
      .toBe('Nothing is blocking work. Nobody named anything holding work up.')
  })

  it('How much was said, a percentage documented', () => {
    expect(tileSentence({ label: 'How much was said', value: '15% documented', sub: 'of what was said is anchored to a document' }))
      .toBe('15 of every 100 things people said have a document behind them.')
  })

  it('How much was said, nothing on record yet', () => {
    expect(tileSentence({ label: 'How much was said', value: 'Nothing on record yet', sub: 'no answers to read' }))
      .toBe('There is nothing on record yet, so there is nothing to check against a document.')
  })
})
