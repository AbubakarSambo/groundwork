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

  /*
   * BOARD REVIEW, 1 OCTOBER, ITEM 2: NEVER ADD WORDS AFTER A FULL SENTENCE. The server can send a
   * whole sentence of its own under `sub`, not a bare topic - "People said different things. There
   * is no shared understanding of the production line's new data structure." used to come out
   * "…data structure. is seen differently.", with four words tacked on after a sentence that had
   * already finished.
   */
  it('Differences, when the topic is already a full sentence of its own', () => {
    expect(tileSentence({
      label: 'Differences', value: '1',
      sub: 'People said different things. There is no shared understanding of the production line’s new data structure.',
    })).toBe('People see one thing differently. People said different things. There is no shared understanding of the production line’s new data structure.')
  })

  it('Differences, with only the generic count', () => {
    expect(tileSentence({ label: 'Differences', value: '2', sub: 'still open, as the written report reads it' }))
      .toBe('People see two things differently. Still open, as the written report reads it.')
  })

  /*
   * U.9 RE-REVIEW: NO DOUBLED "IS SEEN DIFFERENTLY". When the topic the server sends already
   * claims the difference itself, appending "is seen differently" a second time produced "…is
   * seen differently is seen differently." Checked case-insensitively and with or without the
   * topic's own final full stop, since `shortly()` (what-this-session-holds.ts) strips one before
   * sending it.
   */
  it('Differences, when the topic already says it is seen differently, without a full stop', () => {
    expect(tileSentence({ label: 'Differences', value: '1', sub: 'The main obstacle to signing new shops is seen differently' }))
      .toBe('People see one thing differently. The main obstacle to signing new shops is seen differently.')
  })

  it('Differences, when the topic already says it is seen differently, with a full stop', () => {
    expect(tileSentence({ label: 'Differences', value: '1', sub: 'The main obstacle to signing new shops is seen differently.' }))
      .toBe('People see one thing differently. The main obstacle to signing new shops is seen differently.')
  })

  it('Differences, when the topic already says it is seen differently, case-insensitively', () => {
    expect(tileSentence({ label: 'Differences', value: '1', sub: 'the main obstacle to signing new shops IS SEEN DIFFERENTLY' }))
      .toBe('People see one thing differently. The main obstacle to signing new shops IS SEEN DIFFERENTLY.')
  })

  it('Differences, with the thing itself named and more besides, not doubled', () => {
    expect(tileSentence({ label: 'Differences', value: '3', sub: 'The main obstacle to signing new shops is seen differently, and 2 more' }))
      .toBe('People see three things differently. The main obstacle to signing new shops is seen differently, and two more things are too.')
  })

  it('Movement, targets set but no round closed yet', () => {
    expect(tileSentence({ label: 'Movement', value: 'Nothing yet', sub: '2 targets set, and no round has closed to measure from' }))
      .toBe('Nothing has moved yet. Two targets are set, and no check-in has closed to measure them against.')
  })

  /*
   * GROUP 3'S REVIEW, BATCH A FAULT 6: THE REGEX NEVER MATCHED WHAT THE SERVER ACTUALLY SENDS.
   * `what-this-session-holds.ts` writes "6 targets are set, and no round has closed to measure
   * from." - with "are" and a trailing period, neither of which the old pattern allowed - so this
   * fell through to the raw fallback and a real screen read "no round has closed", the retired
   * word, instead of this function's own session-worded sentence.
   */
  it('Movement, the exact sentence the server actually sends ("are", with a trailing period)', () => {
    expect(tileSentence({ label: 'Movement', value: 'Nothing yet', sub: '6 targets are set, and no round has closed to measure from.' }))
      .toBe('Nothing has moved yet. Six targets are set, and no check-in has closed to measure them against.')
  })

  /* Board review, 30 September, item 6: "'One target is set, and no session has closed to measure
     them against' ('it' for one)." - the pronoun has to agree with a single target, not default to
     the plural "them" the way the multi-target case above reads correctly. */
  it('Movement, one target set but no round closed yet - "it", not "them"', () => {
    expect(tileSentence({ label: 'Movement', value: 'Nothing yet', sub: '1 target set, and no round has closed to measure from' }))
      .toBe('Nothing has moved yet. One target is set, and no check-in has closed to measure it against.')
  })

  /*
   * BOARD REVIEW, 1 OCTOBER, ITEM 2: "N TARGETS MOVED" READ A MOVEMENT AMOUNT AS A COUNT OF
   * TARGETS. The server only sends this "+N" shape (what-this-session-holds.ts) for a single
   * target that moved BY N - a count over one target sends "N targets" as the value instead, a
   * different shape entirely. "96 targets moved this session" for `value: "+96"` claimed ninety-six
   * targets moved when only one did, by ninety-six. This can only say the size of the move, so it
   * no longer invents a count: "A target moved by 96 this session."
   */
  it('Movement, one target moved, by a small amount', () => {
    expect(tileSentence({ label: 'Movement', value: '+1', sub: 'targets moved this check-in' }))
      .toBe('A target moved by one this check-in.')
  })

  it('Movement, one target moved, by a figure too large to say as a word', () => {
    expect(tileSentence({ label: 'Movement', value: '+96', sub: 'Targets moved this check-in.' }))
      .toBe('A target moved by 96 this check-in.')
  })

  it('Blockers, with the thing itself named', () => {
    expect(tileSentence({ label: 'Blockers', value: '1', sub: 'The discount decision' }))
      .toBe('One thing is blocking work, the discount decision.')
  })

  it('Blockers, none named', () => {
    expect(tileSentence({ label: 'Blockers', value: 'None', sub: 'nobody named anything holding work up' }))
      .toBe('Nothing is blocking work. Nobody named anything holding work up.')
  })

  /*
   * GROUP 3'S REVIEW, BATCH A FAULT 6: "ONE THING IS BLOCKING WORK, WORK IS HELD UP BY THE
   * DISCOUNT DECISION.." - a bare "." was appended even when `sub` (which `blockerAsASentence` on
   * the server already ends with a period) already had one.
   *
   * BOARD REVIEW, 1 OCTOBER, ITEM 2: THAT FIX STILL JOINED TWO SENTENCES WITH A COMMA. "One thing
   * is blocking work, work is held up by the discount decision." reads as one run-on sentence; `sub`
   * here is already its own complete sentence from the server, so it now follows a full stop of its
   * own, capitalised.
   */
  it('Blockers, with a sentence already ending in its own period, said as two sentences', () => {
    expect(tileSentence({ label: 'Blockers', value: '1', sub: 'Work is held up by the discount decision.' }))
      .toBe('One thing is blocking work. Work is held up by the discount decision.')
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

describe('a tile whose read is still to come says so and never "nothing here" (fix plan 16 November, group 1)', () => {
  const sub = 'Groundwork is still working out what people said. This page will fill in when it has.'
  it('every tile says the one sentence', () => {
    for (const label of ['Differences', 'Movement', 'Blockers', 'How much was said']) {
      expect(tileSentence({ label, value: 'Not read yet', sub })).toBe(sub)
    }
  })
})
