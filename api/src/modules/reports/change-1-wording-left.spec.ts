import { theVerbAgreesWithYouIn } from './party-labels';
import { noStandInLabelIn, theSameNameNotSaidTwice } from './a-stand-in-label-never-reaches-a-reader';
import { theSentenceToTheLead } from '../conversation/the-disagreement-said-once';

/*
 * The two wording faults left from build change 1 (decision 139, item 1), as a reader read them:
 * "Is you waiting" on a question-shaped line, and a name said twice over ("Samuel Owino says Samuel Owino").
 */
describe('a question about "you" takes the verb that goes with it', () => {
  it('turns "Is you", "Was you" and "Has you" round at the start of a question', () => {
    expect(theVerbAgreesWithYouIn('Is you waiting on the price list?')).toBe('Are you waiting on the price list?');
    expect(theVerbAgreesWithYouIn('Thanks. Was you told about the visit?')).toBe('Thanks. Were you told about the visit?');
    expect(theVerbAgreesWithYouIn('Has you sent it yet?')).toBe('Have you sent it yet?');
    expect(theVerbAgreesWithYouIn('Ask why is you waiting so long.')).toBe('Ask why are you waiting so long.');
  });
  it('leaves "you" as the object alone', () => {
    expect(theVerbAgreesWithYouIn('The one waiting is you.')).toBe('The one waiting is you.');
    expect(theVerbAgreesWithYouIn('A key worry for you is that you did not see this coming.')).toBe('A key worry for you is that you did not see this coming.');
  });
  it('is mended on the lead\'s own line when a label is said as "you"', () => {
    const called = new Map([['participant a', 'you'], ['participant b', 'Samuel Owino']]);
    expect(noStandInLabelIn('Is Participant A waiting on Participant B?', called)).toBe('Are you waiting on Samuel Owino?');
  });
});

describe('a name is not said twice in one breath', () => {
  it('says "they" the second time, after a verb of saying', () => {
    expect(theSameNameNotSaidTwice("Samuel Owino says Samuel Owino is still figuring out Samuel Owino's role."))
      .toBe('Samuel Owino says they are still figuring out their role.');
    expect(theSameNameNotSaidTwice('Brian said Brian finished two shops.')).toBe('Brian said they finished two shops.');
  });
  it('leaves two different people, and quoted words, as they are', () => {
    expect(theSameNameNotSaidTwice('Fatuma says Kevin is late.')).toBe('Fatuma says Kevin is late.');
    expect(theSameNameNotSaidTwice('Kevin wrote "Kevin says Kevin is fine".')).toBe('Kevin wrote "Kevin says Kevin is fine".');
  });
  it('is mended where the labels are named', () => {
    const called = new Map([['participant a', 'Samuel Owino']]);
    expect(noStandInLabelIn('Participant A says Participant A is still learning the ticket tool.', called))
      .toBe('Samuel Owino says they are still learning the ticket tool.');
  });
  it('does not wrap a read that already names them in a second name', () => {
    const s = theSentenceToTheLead({ leadName: '', theirOwn: [], target: { name: 'calls a day', target: 15 }, personName: 'Samuel', personHeadline: "Samuel Owino's own account of calls has risen from 6 a day to 10" });
    expect(s).toBe("Samuel Owino's own account of calls has risen from 6 a day to 10. You set calls a day (15) for them. That is the gap this report will show.");
    expect(s).not.toMatch(/Samuel's own account reads/);
    const t = theSentenceToTheLead({ leadName: '', theirOwn: [], target: { name: 'new shops', target: 60 }, personName: 'Brian', personHeadline: 'has named two shops so far' });
    expect(t).toBe("Brian's own account reads: has named two shops so far. You set new shops (60) for them. That is the gap this report will show.");
  });
});
