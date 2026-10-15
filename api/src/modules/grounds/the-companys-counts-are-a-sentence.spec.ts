import { countsLine } from './the-company-page';

/**
 * THE COMPANY PAGE'S ONE SENTENCE OF COUNTS, AS A SENTENCE (group 2's review, fault F). "6 people."
 * and "6 people, 21 check-ins this week." read as noun phrases with a full stop, not sentences -
 * each part now has its own verb, and the parts are joined with "and", never a bare comma.
 */
describe('countsLine', () => {
  it('people alone: "6 people work here."', () => {
    expect(countsLine({ teams: 0, people: 6, checkInsThisWeek: null })).toBe('6 people work here.');
  });

  it('people and check-ins: "6 people work here, and there were 21 check-ins this week."', () => {
    expect(countsLine({ teams: 0, people: 6, checkInsThisWeek: 21 })).toBe('6 people work here, and there were 21 check-ins this week.');
  });

  it('teams and people together: "2 teams and 5 people work here."', () => {
    expect(countsLine({ teams: 2, people: 5, checkInsThisWeek: null })).toBe('2 teams and 5 people work here.');
  });

  it('teams, people and check-ins: "2 teams and 5 people work here, and there were 3 check-ins this week."', () => {
    expect(countsLine({ teams: 2, people: 5, checkInsThisWeek: 3 })).toBe('2 teams and 5 people work here, and there were 3 check-ins this week.');
  });

  it('one check-in reads "there was", not "there were"', () => {
    expect(countsLine({ teams: 0, people: 6, checkInsThisWeek: 1 })).toBe('6 people work here, and there was 1 check-in this week.');
  });

  it('check-ins alone, with nobody counted: "There were 3 check-ins this week."', () => {
    expect(countsLine({ teams: 0, people: 0, checkInsThisWeek: 3 })).toBe('There were 3 check-ins this week.');
  });

  it('nothing at all is no sentence, not a bare full stop', () => {
    expect(countsLine({ teams: 0, people: 0, checkInsThisWeek: null })).toBeNull();
  });

  it('none this week is "no check-ins", never "0 check-ins" (request 161, item 4)', () => {
    expect(countsLine({ teams: 0, people: 8, checkInsThisWeek: 0 })).toBe('8 people work here, and there were no check-ins this week.');
    expect(countsLine({ teams: 0, people: 0, checkInsThisWeek: 0 })).toBe('There were no check-ins this week.');
  });
});
