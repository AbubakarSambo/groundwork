import { claimsTheNumbersDoNotSupport, numbersIn, withoutTheClaimsTheNumbersDoNotSupport } from './a-claim-the-numbers-do-not-support';

/** Adversarial run 2, 20 Sep 2026: "you are past the N40m target" to a man who had said N26m, twice. */
describe('a claim the numbers do not support', () => {
  const said = { theirWords: ['I hit N26m. My number is N26m.', 'My target is N40m by the end of the month.', 'Six credit sales.'] };

  it('reads numbers with their scale', () => {
    expect(numbersIn('N26m and 1,200 bags and 40%')).toEqual([26_000_000, 1200, 40]);
  });

  it('cuts the sentence that says they are past a number they have not reached', () => {
    const reply = 'That is on the sales report. It means you are past the N40m target you set for the end of the month. What is next for the dealers?';
    const r = withoutTheClaimsTheNumbersDoNotSupport(reply, said);
    expect(r.cut).toHaveLength(1);
    expect(r.cut[0].why).toContain('past 40000000');
    expect(r.text).toBe('That is on the sales report. What is next for the dealers?');
  });

  it('leaves it when they have said a number that clears it', () => {
    const r = withoutTheClaimsTheNumbersDoNotSupport('You are past the N20m mark now.', said);
    expect(r.cut).toEqual([]);
  });

  it('cuts a recall that carries a number they never said, and keeps one they did', () => {
    expect(claimsTheNumbersDoNotSupport('Last time you said you were at N80m. Where is that today?', said)).toHaveLength(1);
    expect(claimsTheNumbersDoNotSupport('Last time you said you were at N26m. Where is that today?', said)).toEqual([]);
    /* Dates and small ordinals in a recall are not numbers somebody has to have said. */
    expect(claimsTheNumbersDoNotSupport('Last time, on 12 September 2026, you said six credit sales.', said)).toEqual([]);
  });

  it('never leaves nothing', () => {
    const r = withoutTheClaimsTheNumbersDoNotSupport('You have exceeded the N40m target.', said);
    expect(r.text).toBe('You have exceeded the N40m target.');
    expect(r.cut).toEqual([]);
  });
});

describe('and the streaming gate drops it, unlike its other checks', () => {
  const { SentenceGate } = require('./nothing-invented-reaches-them');
  it('the sentence never reaches the screen', () => {
    const theirs = ['I hit N26m.', 'My target is N40m.'];
    const gate = new SentenceGate(theirs, null, theirs, theirs);
    const out = gate.push('That is on the sales report. It means you are past the N40m target you set. ') + gate.flush();
    expect(out).toContain('That is on the sales report.');
    expect(out).not.toContain('past the N40m');
    expect(gate.hits.map((h: any) => h.check)).toContain('a number claim the record does not support');
  });
});

describe('a unit after a number is not a scale', () => {
  const { numbersIn } = require('./a-claim-the-numbers-do-not-support');
  it('50kg bags is fifty, N50m is fifty million', () => {
    expect(numbersIn('We moved 50kg bags, about 120 of them.')).toEqual([50, 120]);
    expect(numbersIn('N50m for the quarter')).toEqual([50_000_000]);
  });

  it('a count of how often they did something is a claim, and stands only in their words', () => {
    const said = { theirWords: ['I need to follow up with a more detailed capabilities deck.'], record: [] } as any;
    expect(claimsTheNumbersDoNotSupport('You have asked for that before, three times, and you have not received it. What is your plan now?', said)).toHaveLength(1);
    expect(claimsTheNumbersDoNotSupport('You have asked twice, you said. What changed?', { ...said, theirWords: ['I asked them twice already.'] })).toEqual([]);
  });
});

describe('a shortfall the model inferred is cut; one they said, or their figures show, stands', () => {
  const { claimsTheNumbersDoNotSupport: claims } = require('./a-claim-the-numbers-do-not-support');
  const said = (...w: string[]) => ({ theirWords: w } as any);

  it('"some farmers waiting means you did not hit the 40 farmers goal", to a miller who had said no count, comes out', () => {
    const r = claims('Some farmers waiting means you did not hit the 40 farmers a season goal. What was the actual count for this season?', said('Still one operator. Some farmers had to wait.', 'To mill for 40 farmers a season.'));
    expect(r).toHaveLength(1);
    expect(r[0].why).toMatch(/fell short of 40/);
  });

  it('stands when they said a figure below it', () => {
    expect(claims('So you did not reach the 40 farmers goal this season.', said('We milled for 31 farmers this season.', 'The goal was 40.'))).toEqual([]);
  });

  it('and stands when they said in their own words that they fell short', () => {
    expect(claims('You missed the 40 farmers goal.', said('We missed it. Not 40 this time.'))).toEqual([]);
  });
});

describe('B-016: a number they never gave is not put in their mouth as a cost', () => {
  const said = { theirWords: ['I want to sign 15 new shops a week on the coast. So far I have about 9 a week', 'Kilifi is slow because the stock arrives late from the depot.'] };
  it('Amani: "six shops" is cut, the question stays', () => {
    const r = withoutTheClaimsTheNumbersDoNotSupport('That stock is stopping six shops from happening. What is stopping you from going back to Baraka with the specific shops you would have signed?', said);
    expect(r.text).toBe('What is stopping you from going back to Baraka with the specific shops you would have signed?');
  });
  it('a number she did say stands', () => {
    expect(withoutTheClaimsTheNumbersDoNotSupport('The late stock is keeping you at 9 a week. What would change that?', said).cut).toEqual([]);
  });
});
