import { describe, it, expect } from 'vitest'
import { whenTheNextOneOpens, theNextOpenCheckInId, whoRunsThis } from './what-the-end-of-a-check-in-can-say'

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
  /*
   * U.8 REVIEW: A ROW WITH NO availableFrom READ AS "OPEN NOW", WHICH IS NOT TRUE. The next
   * session's row can exist before it has been scheduled (lead-path-dates.spec.ts locks
   * `availableFrom` as `null` in exactly that case), and this said "Your next check-in is open
   * now." on a check-in nobody could open yet - the end card's own "What happens next" then had no
   * true next-opening line, and something false in its place.
   */
  it('says nothing, not "open now", when the next row has no date yet', () => {
    expect(whenTheNextOneOpens([{ id: 'next', sessionNumber: 39, status: 'NOT_STARTED', availableFrom: null }], 'this', now))
      .toBeNull()
    expect(whenTheNextOneOpens([{ id: 'next', sessionNumber: 39, status: 'NOT_STARTED' }], 'this', now))
      .toBeNull()
  })
  /*
   * RE-REVIEW BUG: an IN_PROGRESS session is open whatever its availableFrom says - the same
   * rule the ground pages use for "is my own session open right now" (myOpenOpensLater). Before
   * this, a session started early (or one caught by clock skew) still had a future
   * `availableFrom`, and the Done page said "opens on Sunday" about a check-in already running.
   */
  it('is open now when the next row is already in progress, whatever its availableFrom says', () => {
    expect(whenTheNextOneOpens([{ id: 'next', sessionNumber: 39, status: 'IN_PROGRESS', availableFrom: at(28, 9) }], 'this', now))
      .toBe('Your next check-in is open now.')
    expect(whenTheNextOneOpens([{ id: 'next', sessionNumber: 39, status: 'IN_PROGRESS', availableFrom: null }], 'this', now))
      .toBe('Your next check-in is open now.')
  })
})

/* The id to link to whenever whenTheNextOneOpens says "open now" - so the sentence never appears
   with nowhere for a reader to click through to. */
describe('the id to open when the next check-in is already open', () => {
  const now = new Date(2026, 8, 23, 17, 0)
  const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).toISOString()

  it('is the next row\'s id when it is in progress', () => {
    expect(theNextOpenCheckInId([{ id: 'next', sessionNumber: 39, status: 'IN_PROGRESS', availableFrom: at(28, 9) }], 'this', now))
      .toBe('next')
  })
  it('is the next row\'s id when its availableFrom has already passed', () => {
    expect(theNextOpenCheckInId([{ id: 'next', sessionNumber: 39, status: 'NOT_STARTED', availableFrom: at(22, 9) }], 'this', now))
      .toBe('next')
  })
  it('is null when the next row opens later, or there is none, or nothing is known yet', () => {
    expect(theNextOpenCheckInId([{ id: 'next', sessionNumber: 39, status: 'NOT_STARTED', availableFrom: at(24, 9) }], 'this', now))
      .toBeNull()
    expect(theNextOpenCheckInId([{ id: 'this', sessionNumber: 38, status: 'IN_PROGRESS' }], 'this', now)).toBeNull()
    expect(theNextOpenCheckInId(undefined, 'this', now)).toBeNull()
    expect(theNextOpenCheckInId([{ id: 'next', sessionNumber: 39, status: 'NOT_STARTED', availableFrom: null }], 'this', now))
      .toBeNull()
  })
})

describe('who runs this ("Rukia knows who is here")', () => {
  it('names the lead whenever there is one, whether or not she also answers', () => {
    expect(whoRunsThis({ leadFirstName: 'Rukia' })).toBe('Rukia')
  })
  it('is null when there is no lead name yet', () => {
    expect(whoRunsThis({ leadFirstName: null })).toBeNull()
    expect(whoRunsThis(null)).toBeNull()
  })
})

/*
 * BEFORE THE NEXT ONE EXISTS (sales-first.md, section 5): the card before "That’s right, finish" says when the next
 * check-in opens from the schedule the server serves, in the organisation's zone, so a daily check-in reads "8am"
 * wherever the reader's own machine is.
 */
describe('when the next one opens, from the schedule, before its row exists', () => {
  const now = new Date('2026-10-15T12:00:00.000Z')
  const mid = [{ id: 'ci23', sessionNumber: 23, status: 'IN_PROGRESS', availableFrom: '2026-10-15T13:00:00.000Z' }]
  it('says tomorrow at 8am in Lagos, from the schedule', () =>
    expect(whenTheNextOneOpens(mid, 'ci23', now, { nextOpensAt: '2026-10-16T07:00:00.000Z', zone: 'Africa/Lagos' })).toBe('Your next check-in opens tomorrow at 8am.'))
  it('reads the same instant in the organisation’s own zone, not the reader’s', () =>
    expect(whenTheNextOneOpens(mid, 'ci23', now, { nextOpensAt: '2026-10-16T05:00:00.000Z', zone: 'Africa/Nairobi' })).toBe('Your next check-in opens tomorrow at 8am.'))
  it('says nothing when the server has no time for it (a lead, or the last one)', () =>
    expect(whenTheNextOneOpens(mid, 'ci23', now, { nextOpensAt: null, zone: 'Africa/Lagos' })).toBeNull())
  it('a next row that exists wins over the schedule', () =>
    expect(whenTheNextOneOpens([...mid, { id: 'ci24', sessionNumber: 24, status: 'NOT_STARTED', availableFrom: '2026-10-16T09:00:00.000Z' }], 'ci23', now, { nextOpensAt: '2026-10-16T07:00:00.000Z', zone: 'Africa/Lagos' })).toBe('Your next check-in opens tomorrow at 10am.'))
})
