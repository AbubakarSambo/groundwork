import { describe, it, expect } from 'vitest'
import { entryRestoreBranch, leadReturnsToSaveCard } from './EntryChatPage'

/**
 * GW-ENTRY-RESTORE tripwire.
 *
 * The load-or-start effect used to require `!saved.closed` to restore, so a
 * CLOSED saved session - ended, report generated, not yet saved to an account
 * - fell through to the fresh branch, which calls clearEntrySession(): the
 * transcript and report were silently DELETED on reload, contradicting the
 * on-screen promise "Your answers are saved to this device as you go."
 *
 * Pin the branch decision:
 *  - closed session, no incoming scenario  -> restore (the deletion bug)
 *  - closed session, incoming scenario     -> conflict (ask, never discard)
 *  - open session behaves as before
 *  - the closed lead session (empty history) reopens the save card
 */
describe('entryRestoreBranch: ended sessions are never silently discarded', () => {
  it('restores a CLOSED session on plain reload (was deleted before)', () => {
    expect(entryRestoreBranch({ closed: true }, null)).toBe('restore')
    expect(entryRestoreBranch({ closed: true }, undefined)).toBe('restore')
    expect(entryRestoreBranch({ closed: true }, '')).toBe('restore')
  })

  it('asks instead of discarding when a new scenario arrives over a closed session', () => {
    expect(entryRestoreBranch({ closed: true }, 'NEW_PROJECT')).toBe('conflict')
  })

  it('keeps the existing open-session behaviour', () => {
    expect(entryRestoreBranch({ closed: false }, null)).toBe('restore')
    expect(entryRestoreBranch({ closed: false }, 'NEW_PROJECT')).toBe('conflict')
  })

  it('starts fresh only when nothing is saved', () => {
    expect(entryRestoreBranch(null, null)).toBe('fresh')
    expect(entryRestoreBranch(null, 'NEW_PROJECT')).toBe('fresh')
  })
})

describe('leadReturnsToSaveCard: coordinator lands back on the save card', () => {
  it('reopens the save card for a closed lead session', () => {
    expect(leadReturnsToSaveCard({ flowPath: 'lead', closed: true })).toBe(true)
  })

  it('does not open it for the self path or an unfinished lead capture', () => {
    expect(leadReturnsToSaveCard({ flowPath: 'self', closed: true })).toBe(false)
    expect(leadReturnsToSaveCard({ flowPath: 'lead', closed: false })).toBe(false)
    expect(leadReturnsToSaveCard({})).toBe(false)
  })
})
