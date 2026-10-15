import { describe, it, expect } from 'vitest'
import { theOneEmail, theEmailsIn, whatIsNotAnEmail, aNameFromTheQuestion, readyToSend, whatIsStillNeeded, HOW_OFTEN } from './ask-your-team-one-thing'

/**
 * ASK YOUR TEAM ONE THING.
 *
 * Four fields and no conversation, because the claim this card makes is a two-minute setup with a
 * same-week payoff, and an interview cannot be two minutes.
 */
describe('the emails, as somebody actually pastes them', () => {
  it('takes commas, semicolons, newlines and spaces, in any mix', () => {
    expect(theEmailsIn('a@x.com, b@x.com;c@x.com\n d@x.com')).toEqual(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com'])
  })

  /* Pasting out of a mail client brings the angle brackets and the quotes with it. */
  it('strips what a mail client wraps around them', () => {
    expect(theEmailsIn('<a@x.com> "b@x.com"')).toEqual(['a@x.com', 'b@x.com'])
  })

  it('lowercases and de-duplicates, because a list with one person twice invites them twice', () => {
    expect(theEmailsIn('A@X.com a@x.com')).toEqual(['a@x.com'])
  })

  it('and names what was not an email, so the page can say which one', () => {
    expect(whatIsNotAnEmail('a@x.com, Sahar, b@x')).toEqual(['Sahar', 'b@x'])
    expect(whatIsNotAnEmail('a@x.com b@x.com')).toEqual([])
  })
})

describe('the name', () => {
  /* A fifth field is a fifth reason to abandon this. The question is the best name it could have. */
  it('is the whole question, never its first few words', () => {
    expect(aNameFromTheQuestion('What moved this week, and what is stuck?'))
      .toBe('What moved this week, and what is stuck?')
    expect(aNameFromTheQuestion('What are your three priorities this quarter, and what is blocking you?'))
      .toBe('What are your three priorities this quarter, and what is blocking you?')
    expect(aNameFromTheQuestion('  What   is blocking you?  ')).toBe('What is blocking you?')
  })

  it('is the topic when the question is too long to be a name, and never a cut-off question', () => {
    const long = 'What did you finish this week, what is still open, what is blocking you, and who could help you with it?'
    expect(long.length).toBeGreaterThan(80)
    expect(aNameFromTheQuestion(long)).toBe('Get updates from your team')
  })

  it('and is never empty, however little they typed', () => {
    expect(aNameFromTheQuestion('')).toBe('Get updates from your team')
    expect(aNameFromTheQuestion('   ')).toBe('Get updates from your team')
  })
})

describe('what it takes to send', () => {
  const ok = { pasted: 'a@x.com', theOneLine: 'What is blocking you this week?', howOften: 'WEEKLY' as const, by: '', yourEmail: 'lead@x.com' }

  it('is the five fields and nothing else', () => {
    expect(readyToSend(ok)).toBe(true)
    expect(whatIsStillNeeded(ok)).toBeNull()
  })

  it('and says which one is missing, in the order they are on the page', () => {
    expect(whatIsStillNeeded({ ...ok, pasted: '' })).toBe('Add at least one email address.')
    expect(whatIsStillNeeded({ ...ok, theOneLine: 'hi' })).toBe('Write the one thing you want to ask them.')
    expect(whatIsStillNeeded({ ...ok, howOften: 'ONE_TIME', by: '' })).toBe('Pick the date you want it back by.')
    expect(whatIsStillNeeded({ ...ok, yourEmail: '' })).toBe('Add your own email, so the report has somewhere to go.')
  })

  /*
   * YOUR OWN EMAIL IS THE FIFTH, AND IT BUYS THE SIGN-IN BACK. Her call, 18 September 2026: giving
   * it here is what means nobody has to sign in before they may ask their team anything.
   */
  it('wants one address of your own, not a list and not a near miss', () => {
    expect(readyToSend({ ...ok, yourEmail: '' })).toBe(false)
    expect(readyToSend({ ...ok, yourEmail: 'lead@' })).toBe(false)
    expect(readyToSend({ ...ok, yourEmail: 'a@x.com, b@x.com' })).toBe(false)
    expect(theOneEmail('  Lead@X.com ')).toBe('lead@x.com')
  })

  /* A one-off needs the date; a rhythm does not, and asking for one would be a fifth field. */
  it('only wants a date for the one-off', () => {
    expect(readyToSend({ ...ok, howOften: 'ONE_TIME', by: '' })).toBe(false)
    expect(readyToSend({ ...ok, howOften: 'ONE_TIME', by: '2026-10-02' })).toBe(true)
    expect(readyToSend({ ...ok, howOften: 'DAILY', by: '' })).toBe(true)
  })
})

describe('how often', () => {
  it('offers the three she named, and the one-off', () => {
    expect(HOW_OFTEN.map(o => o.value)).toEqual(['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'ONE_TIME'])
  })

  it('in the words a lead reads rather than the enum', () => {
    expect(HOW_OFTEN.map(o => o.label)).toEqual(['Every day', 'Every week', 'Every two weeks', 'Just once, by a date'])
  })
})
