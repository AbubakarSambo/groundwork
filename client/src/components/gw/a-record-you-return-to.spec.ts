import { describe, it, expect } from 'vitest'
import { whereItStands, whatIsOutstanding } from './where-a-promise-stands'

/**
 * WHERE A PROMISE STANDS, ON THE PAGE SOMEBODY OPENS BEFORE A CONVERSATION.
 *
 * The Context page listed what was agreed and could not say whether any of it had happened, so it
 * read as a list of sentences rather than a record you return to.
 *
 * Everything here reads only what somebody wrote down. Whether being past a date MEANS anything is
 * the report's business, where a blocker can outrank a date and where the four explanations live.
 */
const NOW = new Date('2026-11-04T00:00:00Z')
const on = (iso: string) => new Date(`${iso}T00:00:00Z`)

describe('something that has ended', () => {
  it('is done when it was met', () => {
    expect(whereItStands({ status: 'MET', dueDate: on('2026-10-01') }, NOW).says).toBe('Done')
  })

  it('says replaced, not missed, when it changed', () => {
    /* An expectation that moved is not one that was missed. Showing them the same way makes the
       unfairest reading the easy one. */
    const stand = whereItStands({ status: 'CHANGED', dueDate: on('2026-10-01') }, NOW)
    expect(stand.says).toBe('Replaced by something else')
    expect(stand.tone).not.toBe('late')
  })

  it('and never counts as late however long ago its date was', () => {
    for (const status of ['MET', 'DROPPED', 'CHANGED']) {
      expect(whereItStands({ status, dueDate: on('2020-01-01') }, NOW).tone).not.toBe('late')
    }
  })
})

describe('something still open', () => {
  it('counts the days when its date has passed', () => {
    expect(whereItStands({ dueDate: on('2026-10-30') }, NOW).says).toBe('Past its date by 5 days')
    expect(whereItStands({ dueDate: on('2026-11-03') }, NOW).says).toBe('Past its date by a day')
  })

  it('says today, tomorrow, and this week plainly', () => {
    expect(whereItStands({ dueDate: on('2026-11-04') }, NOW).says).toBe('Due today')
    expect(whereItStands({ dueDate: on('2026-11-05') }, NOW).says).toBe('Due tomorrow')
    expect(whereItStands({ dueDate: on('2026-11-08') }, NOW).says).toBe('Due in 4 days')
  })

  it('and just gives the date when it is further off', () => {
    expect(whereItStands({ dueDate: on('2026-12-20') }, NOW).says).toBe('Due 2026-12-20')
  })
})

describe('something with no date', () => {
  /*
   * WORDING UPDATED (group 3's review, request batch A, fault 2): "They said "9 October" - no date
   * agreed" claimed the opposite of what it had just quoted - "9 October" IS a date, said in words
   * rather than picked from a calendar, so "no date agreed" was never true of it. The sentence now
   * just reports what was said, and says "You" rather than "They" on the reader's own row.
   */
  it('quotes what they said, without claiming no date was agreed over their own words', () => {
    const stand = whereItStands({ dueSaid: 'soon' }, NOW)
    expect(stand.says).toContain('"soon"')
    expect(stand.says).not.toContain('no date agreed')
    expect(stand.says).toBe('They said "soon"')
  })

  it('says "You" on the reader\'s own row, and the person\'s name on somebody else\'s', () => {
    expect(whereItStands({ dueSaid: '9 October' }, NOW, { isMine: true, name: 'Amani Wekesa' }).says).toBe('You said "9 October"')
    expect(whereItStands({ dueSaid: '9 October' }, NOW, { isMine: false, name: 'Amani Wekesa' }).says).toBe('Amani Wekesa said "9 October"')
  })

  it('and says nothing at all when they never mentioned timing', () => {
    expect(whereItStands({}, NOW).says).toBeNull()
  })
})

describe('the line before a conversation', () => {
  it('counts what is past its date and what was never dated', () => {
    const line = whatIsOutstanding([
      { dueDate: on('2026-10-01') },
      { dueDate: on('2026-10-02') },
      { dueSaid: 'soon' },
      { dueDate: on('2026-12-01') },
    ], NOW)
    expect(line).toContain('2 past their dates')
    expect(line).toContain('1 with no date agreed')
  })

  it('never counts something that has ended', () => {
    expect(whatIsOutstanding([{ status: 'MET', dueDate: on('2020-01-01') }], NOW)).toBeNull()
  })

  it('and says nothing when there is nothing to say', () => {
    /* A panel that always has a warning in it is one people stop reading. */
    expect(whatIsOutstanding([{ dueDate: on('2026-12-01') }], NOW)).toBeNull()
    expect(whatIsOutstanding([], NOW)).toBeNull()
  })

  it('counts, and does not characterise', () => {
    const line = whatIsOutstanding([{ dueDate: on('2026-10-01') }], NOW)!
    expect(line).not.toMatch(/\b(behind|failing|slipping|poor|concern)\b/i)
  })
})
