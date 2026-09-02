import { howThisSounds, JUDGES_THE_ANSWER, SAYS_THE_RECORD } from './how-this-sounds';

/**
 * The examples in these tests are real turns, taken verbatim off the local database. They are what
 * "it sounds like an examiner" meant, and they are what the new voice has to stop producing.
 */
describe('how this sounds', () => {
  const REAL_TURNS_BEFORE = [
    "That's a specific reason, and it's now in the record: the client's view is that the integration was broken.",
    'Eighteen percent of recurring revenue is a clear and specific impact. Thank you for starting with that. When did you first learn they had given notice?',
    "That's a specific example, which is helpful. Let's stay with that for a moment. If someone reviewed that two-week period, what would the evidence show?",
    "That's a very clear description of the two perspectives. Which of those two views is closer to your own?",
    "Let's get your version of this on the record.",
  ];

  it('counts the habit that produced the complaint', () => {
    const r = howThisSounds(REAL_TURNS_BEFORE);
    expect(r.judgesTheAnswer).toBe(4);
    expect(r.saysTheRecord).toBe(2);
  });

  it('and counts the one habit worth growing, which these turns do not have', () => {
    expect(howThisSounds(REAL_TURNS_BEFORE).offersAView).toBe(0);
  });

  it('reads the sketch turns as the improvement they are meant to be', () => {
    const AFTER = [
      'Eighteen percent, and you heard it from their CFO before your own team. That second part is its own problem. When did you first hear, and who from?',
      'Twice, agreed twice, still not moving. That stops being a communication problem somewhere around the second time. Who else is waiting on him?',
      'Nine days for a quote, and it went cold in the gap. That is the kind of thing that shows up in a report as a sales problem when it is a pricing one.',
    ];
    const r = howThisSounds(AFTER);
    expect(r.judgesTheAnswer).toBe(0);
    expect(r.saysTheRecord).toBe(0);
    expect(r.offersAView).toBe(3);
    expect(r.endsOnAQuestion).toBe(2); /* one lands and stops, on purpose */
  });

  it('does not fire on an ordinary sentence that happens to start with "that"', () => {
    /* "That changes things" is a view, not a grade. The detector must not eat the voice it wants. */
    expect(JUDGES_THE_ANSWER.test('That changes what the problem is.')).toBe(false);
    expect(JUDGES_THE_ANSWER.test('That is the whole problem.')).toBe(false);
  });

  it('and catches the record wherever it sits in the sentence', () => {
    expect(SAYS_THE_RECORD.test('That is a specific reason, and it is now in the record.')).toBe(true);
    expect(SAYS_THE_RECORD.test('Your record shows the expectation has been clear.')).toBe(true);
  });

  it('sees a view the live model actually wrote, not just the one in the sketch', () => {
    /*
     * Straight off the first live turn after the voice change. This read "the kind of THING that"
     * and the model wrote "the kind of FAILURE that", so the count came back 0 for a turn that
     * plainly carries a view - the instrument reporting the change had failed.
     */
    const live = ["Nine days for a quote, and the account went cold in the gap. That's the kind of failure that often shows up in a report as a sales problem when it's actually a pricing or approvals one."];
    expect(howThisSounds(live).offersAView).toBe(1);
    expect(howThisSounds(live).judgesTheAnswer).toBe(0);
  });

  it('survives empty input', () => {
    expect(howThisSounds([]).turns).toBe(0);
    expect(howThisSounds(['', '  ']).turns).toBe(0);
  });
});
