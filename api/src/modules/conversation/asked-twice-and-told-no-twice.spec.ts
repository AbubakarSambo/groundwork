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
