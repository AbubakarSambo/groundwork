import { theyPushedBackOnTheQuestions, asksTheSameThingAgain } from './asked-twice-and-told-no-twice';

/**
 * THE REAL EXCHANGE, FROM A LIVE CHECK-IN ON 14 SEPTEMBER.
 *
 * A lead came to set objectives for her team, was asked which conversation was closest to a
 * decision, said she had no pipeline and that the questions were wrong, and was asked the same
 * alignment question twice more. Those are her words below, typos and all.
 */
describe('they said the questions were wrong', () => {
  const herWords = [
    'we dont have one. It just want to set ovjectives for my team and i feel you are asking the wrong questions which is annoying',
    'this line of questioning does not align with what i need to do, please just set targets for my team and track it',
  ];

  it.each(herWords)('hears it: %s', (said) => {
    expect(theyPushedBackOnTheQuestions(said)).toBe(true);
  });

  it('does not hear it when somebody simply disagrees about the work', () => {
    for (const said of [
      'the migration is wrong, we never agreed that date',
      'that number is not right, it was nine not nineteen',
      'sales are annoying about the contract but we will get there',
      'selling trucks to customers',
    ]) {
      expect(theyPushedBackOnTheQuestions(said)).toBe(false);
    }
  });

  it('sees the same question in a new coat, which is what she actually got twice', () => {
    const first = "Now, how does this objective of 500 contracts and linked sales connect to the company's overall direction, as you understand it?";
    const again = 'To connect this to the company\'s overall direction, can you name the wider company objective that this sales target directly supports?';
    expect(asksTheSameThingAgain(first, again)).toBe(true);
  });

  it('and lets a genuinely different question through', () => {
    const first = "How does this objective connect to the company's overall direction?";
    for (const moved of [
      'What is the target: how many contracts, and how much money in the bank by when?',
      'Who on your team owns each of those, and by when?',
      'What is in the way of the first one right now?',
    ]) {
      expect(asksTheSameThingAgain(first, moved)).toBe(false);
    }
  });

  it('says nothing about two questions too short to compare', () => {
    expect(asksTheSameThingAgain('Why?', 'How?')).toBe(false);
  });
});

/**
 * THE REPLIES SHE ACTUALLY GOT, LINE FOR LINE.
 *
 * Her verdict on the whole check-in: "It is repeat and going around in circles."
 */
describe('a reply that opens by saying it back', () => {
  const { opensByRepeatingThem } = require('./asked-twice-and-told-no-twice');

  it.each([
    ['500 contracts, daaa. and the sales linked to them',
     '500 contracts and the sales linked to them by the end of the year. Got it. To make sure this objective is aligned, who else in the organization would be able to confirm that reaching 500 contracts means your team has successfully achieved this objective?'],
    ['a contract and money in the bank',
     'A contract and money in the bank. That is concrete. What is the target for that: how many contracts, and how much money in the bank by when?'],
    ['I just want to set objectives for my sales team',
     'You want to set objectives for your sales team. We have identified one clear objective: "500 contracts and linked sales by the end of the year," with the finance team as the verifier. Is there a second key objective your sales team is focusing on for this period?'],
  ])('catches it: %s', (said, reply) => {
    expect(opensByRepeatingThem(said, reply)).toBe(true);
  });

  it('leaves a reply that just gets on and asks', () => {
    expect(opensByRepeatingThem(
      '500 contracts, daaa. and the sales linked to them',
      'Who on the team owns each of those, and by when?',
    )).toBe(false);
  });

  it('and does not fire on a short answer there is nothing to repeat of', () => {
    expect(opensByRepeatingThem('yes', 'Okay. What specific targets will each of them have?')).toBe(false);
    expect(opensByRepeatingThem('finance team', 'Who else would need to confirm it?')).toBe(false);
  });
});
