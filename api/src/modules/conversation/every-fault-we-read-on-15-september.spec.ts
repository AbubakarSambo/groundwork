import { aPromiseTheyNeverMade } from './a-promise-they-never-made';
import { withoutTheGoodbye } from './the-close-is-held-once';
import { theOneThingToDoBetter } from './what-this-session-is-missing';
import { theNumbersDoNotMeet } from './the-numbers-do-not-meet';
import { whatToDoAboutTheirDeadline, didNotSayTheDate, theDateItHadToSay } from './a-period-is-not-a-day';
import { asksForAShapeWithoutShowingOne } from './a-question-that-invents-a-shape-shows-one';
import { opensByRepeatingThem } from './asked-twice-and-told-no-twice';
import { isADeadEnd } from './a-reply-that-asks-nothing-is-a-dead-end';
import { isAnEssay } from './a-reply-is-not-an-essay';
import { wordsWeDoNotUse } from './words-we-do-not-use';
import { readsAsAJudgement } from '../grounds/what-setup-agreed';

/**
 * EVERY FAULT READ OFF A LIVE RUN ON 15 AND 16 SEPTEMBER, IN ONE PLACE, IN THE WORDS IT WAS READ IN.
 *
 * Each guard has its own file and its own spec explaining why it exists. This is the other thing:
 * one list, so the set is visible, and so a fault that was found by running the product cannot go
 * back to being only a memory of an evening. Every string below is real output or a real answer,
 * copied rather than invented.
 *
 * If a guard is ever unwired, its own spec might still pass on a module nobody calls. This one
 * fails on the sentence somebody actually read.
 */
describe('every fault we read on 15 September', () => {
  it('1. the close invented a commitment, out of the engine\'s own example', () => {
    const hers = ['We are at 1,200 units sold so far.', 'The Wuse distributor has not restocked since August.'];
    expect(aPromiseTheyNeverMade('You said you would send the rota by Friday.', hers)).not.toBeNull();
    expect(aPromiseTheyNeverMade('You said you would speak to the Wuse distributor.', hers)).toBeNull();
  });

  it('2. a refused close still said goodbye, so the turn had two endings', () => {
    const both = 'Your report is ready now, and nothing in it needs acting on today. Speak soon.';
    expect(withoutTheGoodbye(both)).toBe('');
    expect(withoutTheGoodbye('That is 1,200 units toward the goal. Speak soon.')).toBe('That is 1,200 units toward the goal.');
  });

  it('3. the session-1 note was given twice in a row, mid interview', () => {
    const has = {
      objectives: [{ name: '10,000 units', target: 10000, ownerParticipantId: null, dueDate: new Date() }],
      peopleInIt: 3, theyRunIt: true, anythingDocumented: false, answersSoFar: 5,
      alreadySaidThisSession: [] as string[],
    };
    expect(theOneThingToDoBetter(has)).not.toBeNull();
    /* Changed 3 November 2026 (no forced close): not on the opener, but no count of answers before it either; when is the model's call. */
    expect(theOneThingToDoBetter({ ...has, answersSoFar: 0 })).toBeNull();
    expect(theOneThingToDoBetter({
      ...has,
      alreadySaidThisSession: ["You haven't given Sahar or Amina a specific number yet for their parts in the 10,000 units."],
    })).toBeNull();
  });

  it('4. nobody asked how 150 bags a month reaches 10,000 units', () => {
    const gap = theNumbersDoNotMeet(
      [{ name: 'units of tea sold in Abuja', target: 10000, ownerParticipantId: null }] as any,
      'I can do about 150 bags a month from my own network',
      [],
    );
    expect(gap).not.toBeNull();
    expect(gap!.theirs).toBe(150);
    expect(gap!.objective).toBe(10000);
  });

  it('5. "end of the year" was taken as a deadline and never became a date', () => {
    const on = new Date('2026-09-15T00:00:00Z');
    const period = whatToDoAboutTheirDeadline('we want it by the end of the year', on);
    expect(period).not.toBeNull();
    const date = theDateItHadToSay('we want it by the end of the year', on)!;
    expect(date).toMatch(/31 December 2026/);
    expect(didNotSayTheDate('So, end of the year then. What is the next step?', date)).toBe(true);
    expect(didNotSayTheDate(`End of the year - so ${date}?`, date)).toBe(false);
  });

  it('6. it asked what good looks like and showed nothing of what an answer is', () => {
    expect(asksForAShapeWithoutShowingOne('What would exist that does not exist today if this is genuinely delivered?')).toBe(true);
    expect(asksForAShapeWithoutShowingOne(
      'What would exist that does not exist today? Something you could point to. For instance, customer invoices, or a sales report.',
    )).toBe(false);
  });

  it('7. it opened by saying their own sentence back to them', () => {
    const theySaid = 'We are at 1,200 units sold so far and Abuja retail is slower than I expected.';
    expect(opensByRepeatingThem(theySaid, 'So you are at 1,200 units sold and Abuja retail is slower than you expected. What is making it slow?')).toBe(true);
    expect(opensByRepeatingThem(theySaid, 'What is making it slow?')).toBe(false);
  });

  it('8. a turn that asks nothing and is not closing leaves them with nowhere to go', () => {
    expect(isADeadEnd('Understood. The shops are important.', false)).toBe(true);
    expect(isADeadEnd('Understood. What does busy mean in units?', false)).toBe(false);
  });

  it('9. a reply that is an essay is not a conversation', () => {
    const essay = Array.from({ length: 70 }, (_, i) => `word${i}`).join(' ') + '. And what happened next?';
    expect(isAnEssay(essay, false)).toBe(true);
  });

  it('10. the words this product does not use kept reaching people', () => {
    expect(wordsWeDoNotUse('It is important to know that this kind of work often faces unfair reading.', [])).not.toHaveLength(0);
    expect(wordsWeDoNotUse('What did the Wuse distributor say when you called?', [])).toHaveLength(0);
  });

  it('11. a judgement about somebody was proposed as the standard they are held to', () => {
    expect(readsAsAJudgement('is struggling with the wholesale accounts')).toBe(true);
    expect(readsAsAJudgement('3,000 units by December')).toBe(false);
  });
});
