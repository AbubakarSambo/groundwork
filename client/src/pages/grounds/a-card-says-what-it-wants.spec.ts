import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { railAttention } from '@/lib/rail-attention'
import { aServedCount } from '@/lib/a-served-count-for-a-spec'

/**
 * THE ONE GLANCEABLE THING ON A CARD SAID NOTHING ABOUT WHETHER IT WANTED YOU.
 *
 * The chip showed `g.moment` - "STARTING" - which is a property of the situation and reads the same
 * on the day a check-in opens and the day it closes. So somebody scanning ten cards had to open each
 * one to find out which needed them.
 *
 * The rail beside it has answered that question for a long time, with `railAttention`. The sidebar
 * was ranking by attention while the list showed the scenario: two answers to one question, from the
 * same data.
 *
 * A CORRECTION THIS CARRIES. The audit said the dashboard had no sorting. It does - by
 * `reportWaitingForMe` and `REPORT_READY` - and that ordering is deliberately untouched here, because
 * it knows about report readiness, which `railAttention` does not. The defect was the chip, not the
 * order.
 */
/* U.5: the list is the prototype's table now, and each row's "Needs you" is worked out in
   how-a-row-reads.ts. The checks below read that file; the rule they hold is unchanged. */
const SRC = readFileSync(join(__dirname, 'how-a-row-reads.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
const LIST = readFileSync(join(__dirname, 'GroundsListPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')

/** A ground shaped the way the list receives one. */
const ground = (over: Record<string, unknown> = {}) => ({
  id: 'g1',
  participants: [{ id: 'p-me', userId: 'u-me' }, { id: 'p-them', userId: 'u-them' }],
  checkIns: [],
  ...over,
})
const openFor = (participantId: string, sessionNumber = 1, availableFrom: string | null = null) =>
  ({ participantId, sessionNumber, status: 'NOT_STARTED', availableFrom })
const doneFor = (participantId: string, sessionNumber = 1) =>
  ({ participantId, sessionNumber, status: 'COMPLETED', availableFrom: null })

describe('a card says what it wants', () => {
  it('the tag is driven by the shared rule, not by the scenario', () => {
    expect(SRC).toContain('railAttention')
    expect(SRC).not.toMatch(/\bg\.moment\b/)
  })

  it('and the row actually calls it, and the page draws what it says', () => {
    expect(SRC).toMatch(/const a = railAttention\(g as never, me, now\)/)
    expect(LIST).toContain('<Tag tone={reads.needs.tone}>{reads.needs.text}</Tag>')
  })

  it('an open round of mine reads as my turn', () => {
    /* As the list serves it: the server's turn on the row (yourTurnIn). */
    const a = railAttention({ ...ground({ checkIns: [openFor('p-me')] }), yourTurn: { checkInId: 'c1', sessionNumber: 1, openedAt: null } } as any, 'u-me')
    expect(a.kind).toBe('yours')
  })

  it('one past its date reads as late, and says how late', () => {
    const twelveDaysAgo = new Date(Date.now() - 12 * 86_400_000).toISOString()
    const a = railAttention({ ...ground({ checkIns: [openFor('p-me', 1, twelveDaysAgo)] }), yourTurn: { checkInId: 'c1', sessionNumber: 1, openedAt: twelveDaysAgo } } as any, 'u-me')
    expect(a.kind).toBe('overdue')
    if (a.kind === 'overdue') expect(a.daysLate).toBeGreaterThan(0)
  })

  it('mine done and theirs not reads as waiting on them', () => {
    const a = railAttention(
      ground({ checkIns: [doneFor('p-me'), openFor('p-them')], theCount: aServedCount({ 1: { on: ['p-me', 'p-them'], answered: ['p-me'] } }) }) as any, 'u-me',
    )
    expect(a.kind).toBe('waiting')
    if (a.kind === 'waiting') expect(a.total - a.done).toBe(1)
  })

  it('a round scheduled for later is not something anybody is late for', () => {
    const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString()
    expect(railAttention(ground({ checkIns: [openFor('p-me', 1, nextWeek)] }) as any, 'u-me').kind).toBe('none')
  })

  it('and every state the rule can return is answered', () => {
    /* If a fifth kind is added, this fails rather than the row silently showing nothing. 'none'
       leaves "Needs you" empty, as the prototype does (U.5); "Nothing due" went with the cards. */
    expect(SRC).toContain("a.kind === 'yours' || a.kind === 'overdue'")
    expect(SRC).toContain("a.kind === 'waiting'")
  })

  it('the list keeps its own ordering, which knows about reports', () => {
    expect(SRC).toContain('reportWaitingForMe')
    expect(SRC).toContain("g.status === 'REPORT_READY'")
    expect(LIST).toMatch(/tone === 'proven' \? 0/)
  })
})
