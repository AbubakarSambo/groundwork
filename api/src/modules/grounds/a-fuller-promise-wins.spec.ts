import { sameRequest, fullerOfEachPromise } from './a-fuller-promise-wins';

/**
 * THE SAME PROMISE, WRITTEN TWICE (request 96, group 2's review, fault B). The exact pairs the
 * review found doubled on Rukia's and Amani's boards, and a check that two genuinely different
 * promises - even ones that happen to share a number - are never folded into one.
 */
describe('sameRequest', () => {
  it.each([
    ['send them the price list', 'send them the price list the same day.'],
    ['I will call IT to get her login', 'I will call IT on Tuesday 29 September to get her login.'],
    ['I will plan shorter routes', 'I will plan shorter routes starting Monday 5 October'],
    ['I will send a technician to both freezers', 'I will send a technician to both freezers on Thursday 1 October'],
    ['I will call the client', 'I will call the client on Wednesday 30 September to get the statement signed.'],
  ])('matches %j and %j as one promise, the dated one fuller', (short, full) => {
    expect(sameRequest(short, full)).toBe(true);
  });

  it('a bare number that is not beside a weekday or a month is content, not a date: two different promises', () => {
    expect(sameRequest('Call customer 0', 'Call customer 1')).toBe(false);
  });

  it('two different promises about the same day are not folded together', () => {
    expect(sameRequest('Call the client', 'Visit Westgate Deli on Friday')).toBe(false);
  });
});

describe('fullerOfEachPromise', () => {
  it('keeps the fuller text of a pair, in the order the group first appeared', () => {
    const rows = [
      { id: 'a', text: 'Visit Westgate Deli on Friday' },
      { id: 'b', text: 'I will call IT to get her login' },
      { id: 'c', text: 'I will call IT on Tuesday 29 September to get her login.' },
    ];
    expect(fullerOfEachPromise(rows).map((r) => r.id)).toEqual(['a', 'c']);
  });
});
