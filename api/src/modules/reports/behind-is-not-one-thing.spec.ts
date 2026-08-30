import { whyNot, WhatIsKnown, NO_DATE_NO_READ } from './why-it-is-not-happening';

/**
 * FOUR REASONS SOMETHING AGREED IS NOT HAPPENING, AND THE ANSWER THAT IT COULD BE ANY OF THEM.
 *
 * "No revenue after 30 days should NOT automatically equal poor performance." Told nothing, blocked
 * by the company, not acted on, or too early are different in kind, and reading one as another is
 * the most damaging thing this product could do to somebody.
 *
 * Most of these cases end in CANNOT_TELL on purpose. That is the honest answer far more often than
 * any of the four, and saying it out loud is what makes the four worth reading.
 */
const NOW = new Date('2026-11-04T00:00:00Z');
const PAST = new Date('2026-10-30T00:00:00Z');
const AHEAD = new Date('2026-12-20T00:00:00Z');

const known = (over: Partial<WhatIsKnown> = {}): WhatIsKnown => ({
  text: 'Three proposals out',
  dueDate: PAST,
  status: 'OPEN',
  seenBySubject: true,
  awareness: 'TOLD',
  openBlockers: [],
  progress: [],
  ...over,
});

describe('nobody told them', () => {
  it('outranks everything, because they cannot be behind on something they have not seen', () => {
    const why = whyNot(known({ seenBySubject: false }), NOW);
    expect(why.kind).toBe('UNDERSTANDING');
    expect(why.says).toContain('not been shown');
  });

  it('and the lead saying so counts too', () => {
    expect(whyNot(known({ awareness: 'NOT_TOLD' }), NOW).kind).toBe('UNDERSTANDING');
  });

  it('even when the date has long passed and nothing has moved', () => {
    /* The unfairest available mistake: reading "nobody told them" as "they did not do it". */
    expect(whyNot(known({ seenBySubject: false, dueDate: PAST, progress: [] }), NOW).kind).toBe('UNDERSTANDING');
  });
});

describe('something is in the way', () => {
  it('is a constraint, not a failure to act', () => {
    const why = whyNot(known({ openBlockers: [{ what: 'pricing approval', onName: 'Hafsah', escalated: false }] }), NOW);
    expect(why.kind).toBe('CONSTRAINT');
    expect(why.says).toContain('pricing approval');
    expect(why.says).toContain('not theirs to clear alone');
  });

  it('says when it has already been raised, because that is a different situation', () => {
    const why = whyNot(known({ openBlockers: [{ what: 'pricing approval', onName: 'Hafsah', escalated: true }] }), NOW);
    expect(why.says).toContain('already been raised');
  });

  it('and outranks the date having passed', () => {
    expect(whyNot(known({ dueDate: PAST, openBlockers: [{ what: 'a signed contract', onName: null, escalated: false }] }), NOW).kind)
      .toBe('CONSTRAINT');
  });
});

describe('the narrow case where the agreed thing is not being done', () => {
  it('needs all four: past the date, seen, nothing in the way, nothing done', () => {
    const why = whyNot(known(), NOW);
    expect(why.kind).toBe('EXECUTION');
  });

  it('says what it rests on rather than pronouncing', () => {
    /* "No blocker was recorded" is not "there was no blocker" - it means nobody wrote one down. */
    const why = whyNot(known(), NOW);
    expect(why.says).toContain('no blocker has been recorded');
    expect(why.says).toContain('worth asking about');
    expect(why.says).not.toMatch(/\b(failed|poor|underperform|not capable)\b/i);
  });

  it('becomes late rather than untouched the moment anything is recorded as done', () => {
    const why = whyNot(known({ progress: [{ text: 'One proposal drafted' }] }), NOW);
    expect(why.kind).toBe('CANNOT_TELL');
    expect(why.says).toContain('late rather than untouched');
  });
});

describe('too early to read anything', () => {
  it('when the date they gave has not arrived', () => {
    const why = whyNot(known({ dueDate: AHEAD }), NOW);
    expect(why.kind).toBe('TOO_EARLY');
    expect(why.says).toContain('has not arrived yet');
  });
});

describe('the honest answer, which is the commonest', () => {
  it('a promise with no date cannot be late, however quiet it has been', () => {
    const why = whyNot(known({ dueDate: null }), NOW);
    expect(why.kind).toBe('CANNOT_TELL');
    expect(why.says).toBe(NO_DATE_NO_READ);
    /* And it asks for the missing thing rather than shrugging. */
    expect(NO_DATE_NO_READ).toContain('Worth agreeing one');
  });

  it('nothing is explained about something that already ended', () => {
    for (const status of ['MET', 'DROPPED', 'CHANGED']) {
      const why = whyNot(known({ status }), NOW);
      expect(why.kind).toBe('CANNOT_TELL');
      expect(why.says).toContain(status.toLowerCase());
    }
  });

  it('a changed expectation is never read as a missed one', () => {
    /* The difference between "we moved it" and "he missed it" is the whole point of the status. */
    expect(whyNot(known({ status: 'CHANGED', dueDate: PAST }), NOW).kind).not.toBe('EXECUTION');
  });
});
