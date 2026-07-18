import { describe, it, expect } from 'vitest'
import { SITUATION_CARDS } from './EntryChatPage'

/**
 * Entry-card routing tripwire.
 *
 * The /start cards' `message` fields are what actually ROUTE: they are sent to
 * the AI as the person's first turn and drive scenario classification. Labels
 * and details are display-only and may be reframed freely; the messages must
 * never change as part of a copy pass, or routing behaviour silently shifts.
 *
 * These are the exact message strings as they were BEFORE the entry-card voice
 * reframe. If any assertion here fails, a copy change has leaked into routing.
 */
const PINNED_MESSAGES = [
  'I have a new hire starting and want to make sure we set clear expectations from the beginning.',
  'We are starting a new project and I want to get the team aligned on goals and roles from the beginning.',
  'We have a new working arrangement starting and want to make sure we are set up well.',
  'A team member is not delivering and I need to address it. I want to make sure I have the full picture before we talk.',
  'I am running a performance improvement plan and want both sides to have a fair record of where things stand.',
  'My cofounder and I have a dispute about contributions and direction. I need to get both sides on record.',
  'A project of mine has drifted from what we originally agreed and I want to realign the team on where things actually stand.',
  'I need to realign with a team member. I think we see the current situation differently and want to get both our accounts on record.',
]

describe('entry cards: display reframed, routing untouched', () => {
  it('message fields are byte-identical to the pre-reframe originals', () => {
    expect(SITUATION_CARDS.map(c => c.message)).toEqual(PINNED_MESSAGES)
  })

  it('labels carry the reframed voice (old confrontational labels gone)', () => {
    const labels = SITUATION_CARDS.map(c => c.label)
    expect(labels).not.toContain('Team member not delivering')
    expect(labels).not.toContain('Cofounder or partner dispute')
    expect(labels).not.toContain('Running a PIP')
    expect(labels).toContain("Someone's work is off track")
    expect(labels).toContain('Running a performance improvement plan')
    expect(labels).toContain('Co-founder or partner disagreement')
  })

  it('the starting cards carry the plain voice (the last three un-reframed strings)', () => {
    const labels = SITUATION_CARDS.map(c => c.label)
    expect(labels).toContain('New project')
    expect(labels).toContain('A new way of working together')
    expect(labels).not.toContain('New project kickoff')
    expect(labels).not.toContain('New working arrangement')
    const arrangement = SITUATION_CARDS.find(c => c.label === 'A new way of working together')!
    expect(arrangement.detail).toBe(
      'Someone new is in the picture: a partner, a manager, a changed team. Say what each of you expects before those assumptions harden.',
    )
    for (const c of SITUATION_CARDS) {
      expect(c.label, `label of "${c.label}"`).not.toMatch(/kickoff|working arrangement/i)
      expect(c.detail, `detail of "${c.label}"`).not.toMatch(/reporting line|clear foundation/i)
    }
  })

  it('details are de-jargoned (no "aligned from day one", no "on record")', () => {
    for (const c of SITUATION_CARDS) {
      expect(c.detail, `detail of "${c.label}"`).not.toMatch(/on record/i)
      expect(c.detail, `detail of "${c.label}"`).not.toMatch(/aligned from day one/i)
    }
  })

  it('every card still carries its recognizer sub-examples', () => {
    for (const c of SITUATION_CARDS) {
      expect(c.examples.length, `examples of "${c.label}"`).toBeGreaterThanOrEqual(2)
    }
  })
})
