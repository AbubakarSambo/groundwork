import { describe, it, expect } from 'vitest'
import { whenTheNextOneOpens, whoElseAnswers } from './what-the-end-of-a-check-in-can-say'

/* The sentence the end card and the Done page say about the next check-in (check-in-end-card.txt:
   "Your next check-in opens tomorrow at 4pm."). Dates are read in the test machine's time zone. */
describe('when the next check-in opens, in one sentence', () => {
  const now = new Date(2026, 8, 23, 17, 0)
  const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).toISOString()

  it('tomorrow', () => {
    expect(whenTheNextOneOpens([{ id: 'next', sessionNumber: 39, status: 'NOT_STARTED', availableFrom: at(24, 16) }], 'this', now))
      .toBe('Your next check-in opens tomorrow at 4pm.')
  })
  it('later today, with minutes when there are some', () => {
    expect(whenTheNextOneOpens([{ id: 'next', sessionNumber: 39, status: 'NOT_STARTED', availableFrom: at(23, 20, 30) }], 'this', now))
      .toBe('Your next check-in opens today at 8:30pm.')
  })
  it('further off, with the day', () => {
    expect(whenTheNextOneOpens([{ id: 'next', sessionNumber: 39, status: 'NOT_STARTED', availableFrom: at(28, 9) }], 'this', now))
      .toBe('Your next check-in opens on Monday 28 September at 9am.')
  })
  it('open already', () => {
    expect(whenTheNextOneOpens([{ id: 'next', sessionNumber: 39, status: 'NOT_STARTED', availableFrom: at(22, 9) }], 'this', now))
      .toBe('Your next check-in is open now.')
  })
  it('says nothing when there is no next one yet, and never counts the one being answered', () => {
    expect(whenTheNextOneOpens([{ id: 'this', sessionNumber: 38, status: 'IN_PROGRESS' }], 'this', now)).toBeNull()
    expect(whenTheNextOneOpens(undefined, 'this', now)).toBeNull()
  })
})

describe('who else answers', () => {
  const ground = { participants: [
    { partyType: 'INITIATOR', userId: 'u-w', user: { firstName: 'Wairimu' } },
    { partyType: 'PARTICIPANT', userId: 'u-m', user: { firstName: 'Miriam' } },
  ] }
  it('names the lead to someone else', () => expect(whoElseAnswers(ground, 'u-m')).toBe('Wairimu'))
  it('not to the lead', () => expect(whoElseAnswers(ground, 'u-w')).toBeNull())
  it('not when the lead only manages', () => expect(whoElseAnswers({ participants: [{ ...ground.participants[0], managingOnly: true }, ground.participants[1]] }, 'u-m')).toBeNull())
  it('not when the reader cannot see the lead', () => expect(whoElseAnswers({ participants: [ground.participants[1]] }, 'u-m')).toBeNull())
})
