import { whenThisWouldHaveSurfaced } from './when-this-would-have-surfaced';

const base = {
  measure: 'response time', dueOn: null as Date | null,
  thisSession: 3, plannedSessions: 6, thereIsALater: true,
  today: new Date('2026-09-11T00:00:00.000Z'),
};

describe('a counterfactual is not a prediction', () => {
  it('names the date the measure falls due, because that is when somebody was always going to look', () => {
    const r = whenThisWouldHaveSurfaced({ ...base, dueOn: new Date('2026-10-31T00:00:00.000Z') });
    expect(r?.say).toContain('the response time falling due');
    expect(r?.howFarOff).toBe('7 weeks');
  });

  it('falls back to the end of the run, which is when the question gets asked anyway', () => {
    const r = whenThisWouldHaveSurfaced(base);
    expect(r?.say).toBe('The next time this would have come up on its own is the end of this run, 3 check-ins away.');
  });

  it('says nothing at all when there is no later', () => {
    /* A one-off read has no next occasion; a final session has none left; a shock has already
       surfaced, which is why the check-in exists. */
    expect(whenThisWouldHaveSurfaced({ ...base, thereIsALater: false })).toBeNull();
  });

  it('and nothing when the run is on its last session', () => {
    expect(whenThisWouldHaveSurfaced({ ...base, thisSession: 6, plannedSessions: 6 })).toBeNull();
    expect(whenThisWouldHaveSurfaced({ ...base, plannedSessions: null })).toBeNull();
  });

  it('never reaches for the next session, which is not an occasion', () => {
    /* The next time this check-in runs is not a moment anything would have surfaced at. It is just
       the next time somebody is asked. */
    const r = whenThisWouldHaveSurfaced(base);
    expect(r?.say).not.toMatch(/next session|next check-in\b/i);
  });

  it('ignores a due date that has already passed rather than saying it is ahead', () => {
    const r = whenThisWouldHaveSurfaced({ ...base, dueOn: new Date('2026-08-01T00:00:00.000Z') });
    expect(r?.occasion).toBe('the end of this run');
  });

  it('says what it is about without the measure, rather than inventing a name for it', () => {
    const r = whenThisWouldHaveSurfaced({ ...base, measure: null, dueOn: new Date('2026-12-01T00:00:00.000Z') });
    expect(r?.say).toContain('the date this was due');
  });

  it('never says what the number would have been, or that anybody would have missed it', () => {
    const said = [
      whenThisWouldHaveSurfaced({ ...base, dueOn: new Date('2026-10-31T00:00:00.000Z') })?.say ?? '',
      whenThisWouldHaveSurfaced(base)?.say ?? '',
    ].join(' ');
    expect(said).not.toMatch(/would have (been|missed|failed|shown)|too late|nobody would|by then/i);
  });

  it('reads in whole weeks and months, which is honest about how precisely it knows', () => {
    expect(whenThisWouldHaveSurfaced({ ...base, dueOn: new Date('2026-09-20T00:00:00.000Z') })?.howFarOff).toBe('9 days');
    expect(whenThisWouldHaveSurfaced({ ...base, dueOn: new Date('2027-03-01T00:00:00.000Z') })?.howFarOff).toBe('6 months');
  });
});

describe('and three situations get nothing, asked as one condition', () => {
  const { ONE_SITTING_ONLY, ALREADY_IN_THE_OPEN } = require('./there-is-not-always-a-next-time');

  it('a one-off read has no next occasion, by design', () => {
    /* Its own pack calls it the one situation where a single report is the right shape: no
       objective, no target, no next session. */
    expect(ONE_SITTING_ONLY.has('SNAPSHOT')).toBe(true);
  });

  it('and a shock has already surfaced, which is why the check-in exists', () => {
    /* Saying when it would have come up on its own would be the product telling somebody their
       emergency was on a schedule. */
    expect(ALREADY_IN_THE_OPEN.has('ACUTE_SHOCK')).toBe(true);
    expect(ALREADY_IN_THE_OPEN.has('CRISIS_ALIGNMENT')).toBe(true);
  });

  it('and an ordinary run is in neither list, so it gets the sentence', () => {
    for (const s of ['NEW_PROJECT', 'PULSE_CHECK', 'OKR_ALIGNMENT']) {
      expect(ONE_SITTING_ONLY.has(s) || ALREADY_IN_THE_OPEN.has(s)).toBe(false);
    }
  });
});
