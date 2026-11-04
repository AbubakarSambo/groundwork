import { theirWeekInWords } from './the-participants-week';

/**
 * MERCY'S "YOUR WEEK", THURSDAY 15 OCTOBER (Drop Access, messages test, fourth run). It listed her one wait for Joseph's samples twice:
 * "the sample units he promised" (Monday) and "the Tuskys Westgate samples" (Wednesday).
 */

describe("Mercy's week", () => {
  it('says her wait for the samples once, with the customer it is for', () => {
    const w = theirWeekInWords('Mercy', {
      kept: { kept: 1, of: 1 }, keptWhat: ['Call Mrs. Njeri tomorrow to get the order signed'], keptSince: 'Monday 12 October', open: [],
      waitingOn: [{ what: 'the sample units he promised', from: 'Joseph' }, { what: 'the Tuskys Westgate samples', from: 'Joseph' }],
      waitingOnYou: [],
    })!;
    expect(w.lines).toEqual([
      'Hello Mercy. Here is your week.',
      'You kept the one thing you said you would do since Monday 12 October, "Call Mrs. Njeri tomorrow to get the order signed".',
      'You are waiting for "the Tuskys Westgate samples" from Joseph.',
    ]);
  });
  it('two different things from the same person are still two', () => {
    const w = theirWeekInWords('Mercy', { kept: null, open: [], waitingOn: [{ what: 'the Tuskys Westgate samples', from: 'Joseph' }, { what: 'the price list', from: 'Joseph' }], waitingOnYou: [] })!;
    expect(w.lines.filter((l) => l.startsWith('You are waiting for'))).toHaveLength(2);
  });
});
