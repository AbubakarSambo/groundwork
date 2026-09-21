import { describe, it, expect } from 'vitest'
import { opensStraightOnTheQuestion, justTheQuestion, whereTheLinkGoes } from './the-link-opens-on-the-question'

describe('the link opens on the question', () => {
  it('skips the accept screen for a team update, and for nothing else', () => {
    expect(opensStraightOnTheQuestion('TEAM_UPDATES')).toBe(true)
    expect(opensStraightOnTheQuestion('GOAL_ALIGNMENT')).toBe(false)
    expect(opensStraightOnTheQuestion(null)).toBe(false)
  })

  /* Somebody being asked about work involving a colleague reads what happens to their words first. */
  it('sends a team update to a bare chat and everyone else to the ordinary one', () => {
    expect(whereTheLinkGoes('c1', 'TEAM_UPDATES')).toBe('/checkin/c1?just=1')
    expect(whereTheLinkGoes('c1', 'ROLE_HANDOVER')).toBe('/checkin/c1')
  })

  it('and the mark on the address is what makes it bare', () => {
    expect(justTheQuestion('?just=1')).toBe(true)
    expect(justTheQuestion('?just=0')).toBe(false)
    expect(justTheQuestion('')).toBe(false)
  })
})
