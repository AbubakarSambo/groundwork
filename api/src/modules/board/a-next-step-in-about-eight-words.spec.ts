import { inAboutEightWords, aStepOnItsOwn } from './what-happens-next-to-a-record';

/* Hafsah, 25 October: "Next-step lines: about 8 words at most. Shorter, not vaguer: keep names, numbers and days." Lines from Drop Access (test). */
describe('a next step, in about eight words', () => {
  it.each([
    ['Waiting on Mrs Atieno for her final decision on the number of units and confirmation of payment', 'Waiting on Mrs Atieno for her final decision'],
    ['Juja Hardware wants 5 units at KES 4,500 instead of 5,000, and Joseph is waiting', 'Juja Hardware wants 5 units at KES 4,500'],
    ['Try to reach them again next week to get those details', 'Try to reach them again next week'],
    ['Arrange for her dispenser to be delivered this week', 'Arrange for her dispenser to be delivered this week'],
    ['Get that price to Juja Hardware this week', 'Get that price to Juja Hardware this week'],
    ['Paul has not answered three calls from Kevin, on 13 and 14 October.', 'Paul has not answered three calls from Kevin, on 13 and 14 October.'],
  ])('%s', (long, short) => {
    expect(inAboutEightWords(long)).toBe(short);
    /* About eight words; up to fourteen only where a cut would drop a name, number or day. */
    expect(short.split(' ').length).toBeLessThanOrEqual(14);
  });

  it('starts with a capital and has no full stop, as the column reads it', () => {
    expect(aStepOnItsOwn('collect the deposit, nothing is booked.')).toBe('Collect the deposit, nothing is booked');
  });
});
