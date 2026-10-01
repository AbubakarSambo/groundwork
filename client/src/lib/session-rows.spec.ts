import { describe, it, expect } from 'vitest'
import { buildSessionRows } from './session-rows'

/**
 * BOARD REVIEW, 1 OCTOBER, ITEM 3: THE REPORTS LIST SHOWED A DATE IN THE FUTURE.
 *
 * "Session 2, 6 Oct" (that session's `availableFrom`, the day it was SCHEDULED to open) sat beside
 * that same session's own page saying "Session 2 opened on 30 September" (when the first account
 * in it actually completed). `opened` now reads the earliest `completedAt` among that session's
 * check-ins, the same fact the board's phase-spine timeline already uses; `availableFrom` is kept
 * only as `opensOn`, for a session nobody has started.
 */
describe('buildSessionRows: when a session really opened', () => {
  const labelInASentence = (p: any) => p.name ?? 'a colleague'

  it('reads `opened` from the first completion, not the scheduled availableFrom', () => {
    const ground = {
      participants: [{ id: 'p1', userId: 'u1', name: 'Rukia Otieno', managingOnly: false }],
      checkIns: [
        {
          id: 'c1', participantId: 'p1', sessionNumber: 2, status: 'COMPLETED', isSetup: false,
          availableFrom: '2026-10-06T00:00:00.000Z',
          completedAt: '2026-09-30T09:00:00.000Z',
        },
      ],
      roundCompletions: [],
    }
    const rows = buildSessionRows(ground, 'u1', labelInASentence)
    expect(rows).toHaveLength(1)
    expect(rows[0].opened).toBe('2026-09-30T09:00:00.000Z')
    expect(rows[0].opensOn).toBe('2026-10-06T00:00:00.000Z')
  })

  it('leaves `opened` null and keeps `opensOn` for a session nobody has started', () => {
    const ground = {
      participants: [{ id: 'p1', userId: 'u1', name: 'Rukia Otieno', managingOnly: false }],
      checkIns: [
        { id: 'c1', participantId: 'p1', sessionNumber: 1, status: 'COMPLETED', isSetup: false, availableFrom: null, completedAt: '2026-09-20T09:00:00.000Z' },
        { id: 'c2', participantId: 'p1', sessionNumber: 2, status: 'NOT_STARTED', isSetup: false, availableFrom: '2026-10-06T00:00:00.000Z', completedAt: null },
      ],
      roundCompletions: [],
    }
    const rows = buildSessionRows(ground, 'u1', labelInASentence)
    /* Session 2 has no completion yet, so the numbers filter leaves it out entirely - only session
       1, which is really open, is in the list. */
    expect(rows.map((r) => r.sessionNumber)).toEqual([1])
    expect(rows[0].opened).toBe('2026-09-20T09:00:00.000Z')
  })
})
