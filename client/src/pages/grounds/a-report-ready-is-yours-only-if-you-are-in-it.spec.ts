import { describe, it, expect } from 'vitest'
import { howARowReads } from './how-a-row-reads'

/**
 * LIVE WALK, 6 OCTOBER (the hundred-check-in organisation). A check-in still carrying the old
 * REPORT_READY status read "Your report is ready" to Zuri, an admin who is not in it. The status
 * says a report exists, not that it is hers.
 */
const row = (initiatorId: string) => ({
  id: 'g1', label: 'Stock counts, round 5', status: 'REPORT_READY', initiatorId, cadence: 'WEEKLY',
  participants: [{ id: 'p1', userId: 'u-kofi', firstName: 'Kofi' }], checkIns: [],
}) as any

describe('a check-in whose report is ready', () => {
  it('to somebody in it: "Your report is ready"', () => {
    expect(howARowReads(row('u-kofi'), 'u-kofi').needs?.text).toBe('Your report is ready')
  })
  it('to an admin who is not in it: "The report is ready", never "Your"', () => {
    expect(howARowReads(row('u-kofi'), 'u-zuri', new Date(), { isAdmin: true }).needs?.text).toBe('The report is ready')
  })
})
