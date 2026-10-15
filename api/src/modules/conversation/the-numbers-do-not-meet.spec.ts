import { theNumbersIn, theNumbersDoNotMeet, askWhichItIs, saidBothNumbers, theQuestionAboutTheNumbers } from './the-numbers-do-not-meet';

/*
 * "The chat had contexts on us not being aligned on who is doing what and the gap between what we
 * said and what needs to be met and didnt point it out or ask us to clarify."
 *
 * The check-in was aiming at 10,000 units of tea. In her own session she said "my target is 150
 * bags" and "they are meant to sell 50 bags each". The next question was about the pricing sheet.
 */
describe('the numbers do not meet', () => {
  const objective = [{ name: '10,000 units of tea', target: 10000, ownerParticipantId: null }];

  it('catches her case', () => {
    const gap = theNumbersDoNotMeet(objective, 'my target is 150 bags')!;
    expect(gap.theirs).toBe(150);
    expect(gap.objective).toBe(10000);
  });

  it('says nothing when the number is already theirs on record', () => {
    expect(theNumbersDoNotMeet(objective, 'my target is 150 bags', [150])).toBeNull();
  });

  it('and nothing when their number is a sane share of the whole', () => {
    expect(theNumbersDoNotMeet([{ name: '500 contracts', target: 500, ownerParticipantId: null }], 'I carry 150')).toBeNull();
  });

  it('asks with both numbers in it, and concludes nothing', () => {
    const ask = askWhichItIs(theNumbersDoNotMeet(objective, 'my target is 150 bags')!);
    expect(ask).toContain('10,000');
    expect(ask).toContain('150');
    expect(ask).toMatch(/DO NOT CONCLUDE ANYTHING/);
    expect(ask).toMatch(/three innocent answers/);
  });

  it('and checks the reply actually said them both', () => {
    const gap = theNumbersDoNotMeet(objective, 'my target is 150 bags')!;
    expect(saidBothNumbers('What is in the way?', gap)).toBe(false);
    expect(saidBothNumbers('The check-in is aiming at 10,000. You said 150 - which is it?', gap)).toBe(true);
    expect(theQuestionAboutTheNumbers(gap)).toContain('10,000');
  });
});

/*
 * A DATE IS NOT A TARGET. Driven live: "I will give Sahar and Amina their numbers by Friday the
 * 25th" came back as "you have said 25 - is that your own part of the 10,000?" - a day of the
 * month read as a goal, in answer to the most cooperative sentence in the conversation.
 */
describe('and a date is never read as a target', () => {
  it('leaves every shape of date alone', () => {
    for (const said of [
      'I will give them their numbers by Friday the 25th',
      'by 31 December 2026',
      'on the 15th',
      'we met on May 12',
      'we start in 2026 and finish later',
    ]) {
      expect(theNumbersIn(said)).toEqual([]);
    }
  });

  it('while still reading the numbers that are targets', () => {
    expect(theNumbersIn('my target is 150 bags')).toEqual([150]);
    expect(theNumbersIn('10,000 units and 150 bags')).toEqual([10000, 150]);
  });

  it('including a four-digit target, which the year rule used to swallow', () => {
    /* "Sahar does 2000 units" is the exact sentence this is for. A year stands alone; a target is
       counting something, and the word after it is what separates them. */
    expect(theNumbersIn('Sahar does 2000 units')).toEqual([2000]);
    expect(theNumbersIn('the target is 2000')).toEqual([]);
  });

  it('and small counts, which are not goals', () => {
    expect(theNumbersIn('I spoke to 2 of the biggest customers')).toEqual([]);
  });
});

describe('once per session, and never about a percentage', () => {
  const { theNumbersDoNotMeet, theNumbersIn } = require('./the-numbers-do-not-meet');
  const objectives = [{ name: '$400,000 in new business', target: 400_000, ownerParticipantId: null }];
  it('a percentage is not a part of the objective', () => {
    expect(theNumbersIn("Dayo's arrears are at 18%.")).toEqual([]);
    expect(theNumbersIn("It's 13m now.")).toEqual([13000000]);
    expect(theNumbersIn('Total is N6.2m. All of it on credit.')).toEqual([6200000]);
    expect(theNumbersIn("Greenfield's terms are 30 days. Most of the others are 15.")).toEqual([15]);
    expect(theNumbersIn('We are at 18 percent on credit and 71,000,000 sold.')).toEqual([71_000_000]);
  });
  it('is not asked again once an earlier turn put both numbers to them', () => {
    expect(theNumbersDoNotMeet(objectives, 'A small NGO proposal, around $12,000.', [], [])).not.toBeNull();
    const asked = ['This check-in is aiming at 400,000. You said 12,000. Is that your own part of it, or is the 400,000 something else?'];
    expect(theNumbersDoNotMeet(objectives, 'The $12,000 is one project.', [], asked)).toBeNull();
  });
});
