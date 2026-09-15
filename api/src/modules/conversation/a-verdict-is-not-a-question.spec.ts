import { isAVerdictAboutSomebodyElse, aThirdPartyIsInPlay } from './a-verdict-is-not-a-question';

/**
 * THE PRODUCT TOOK A VIEW ON SOMEBODY WHO WAS NOT IN THE ROOM.
 *
 * Rita said the leads were not qualified, that she had raised it with Marketing twice, and that
 * nothing changed. The replies, off the real transcript:
 *
 *   "That's not just a problem with the leads; it is a problem that wastes your time."
 *   "You've raised this with Marketing twice, and nothing has changed. That stops being a
 *    communication problem somewhere around the second time."
 *
 * Nobody in Marketing is in that conversation. They cannot answer, they will read the board it
 * feeds, and the product has agreed with one side about them in its own voice. The prompt carries
 * three and a half thousand characters on exactly this rule and it did not hold.
 */
describe('a verdict is not a question', () => {
  const hers = 'The leads coming through are not qualified. Marketing. I have said it twice and nothing changed.';

  it.each([
    "You've raised this with Marketing twice, and nothing has changed. That stops being a communication problem somewhere around the second time. What is the impact?",
    "That's not just a problem with the leads; it is a problem that wastes your time. What would qualified look like?",
    'Half of them are not in your segment, which suggests a breakdown before they reach you. What does that cost you?',
  ])('catches it: %s', (reply) => {
    expect(isAVerdictAboutSomebodyElse(hers, reply)).toBe(true);
  });

  /**
   * AND THE ONE THAT SLIPPED PAST THE FIRST LIST.
   *
   * Session two, off a real run. She said the aggregation point was still slowing things down and
   * got back "that is the kind of thing that shows up as a sales problem when it's a systems one."
   * Same move as everything above and none of the phrasings covered it, which is what a list of
   * phrasings does. Found by running a session, not by reading the list.
   */
  it.each([
    "Eighteen of fifty for you. That is the kind of thing that shows up as a sales problem when it's a systems one. What has that meant?",
    'What you are actually dealing with is a process problem in sales. What would move it?',
    'That is the kind of issue marketing usually causes. What have you tried?',
  ])('catches the shapes the first list missed: %s', (reply) => {
    expect(isAVerdictAboutSomebodyElse(hers, reply)).toBe(true);
  });

  it('and still leaves a reply that just names her number and asks', () => {
    expect(isAVerdictAboutSomebodyElse(
      'We are at 18 of my 50. The aggregation point is still slowing everything down.',
      'Eighteen of fifty, and the aggregation point is still in the way. What would move it?',
    )).toBe(false);
  });

  it('catches "that means you", which the end-to-end run walked straight through', () => {
    /* The pattern required "that means there/this/that/it". Rita said Marketing had not changed
       anything twice, and got "That means you're seeing a problem that's impacting your ability to
       close deals, and it's not being addressed." Same sentence, doing the same job. */
    expect(isAVerdictAboutSomebodyElse(
      'Marketing. I have said it twice and nothing changed.',
      "You've raised this with Marketing twice and nothing has changed. That means you're seeing a problem that's impacting your ability to close deals. What would need to change?",
    )).toBe(true);
  });

  it('leaves a plain reflection of what she said, which is the job', () => {
    expect(isAVerdictAboutSomebodyElse(hers, 'You raised it with Marketing twice and nothing changed. What has that cost you this quarter?')).toBe(false);
  });

  it('leaves the same idea offered back as a question, which is the whole difference', () => {
    expect(isAVerdictAboutSomebodyElse(hers, 'Does that stop being a communication problem at some point? What would you want to happen next?')).toBe(false);
  });

  it('leaves somebody being re-characterised about their own work', () => {
    expect(isAVerdictAboutSomebodyElse('I keep missing my own deadlines', 'That is not just a scheduling thing. What is underneath it?')).toBe(false);
  });

  it('treats a department as a person, because it lands on the people in it', () => {
    expect(aThirdPartyIsInPlay('finance have not signed it off', 'x')).toBe(true);
    expect(aThirdPartyIsInPlay('legal keep pushing it back', 'x')).toBe(true);
  });

  it('and reads a named colleague the same way', () => {
    expect(isAVerdictAboutSomebodyElse('Kunle has not sent the pricing', 'That is not just a delay. What does it block?')).toBe(true);
  });

  it('does not read a sentence opener as somebody called That', () => {
    /* The first version did, because a sentence starts with a capital and "is" is on the verb list. */
    expect(aThirdPartyIsInPlay('I am behind on my own work', 'That is not just a scheduling thing.')).toBe(false);
    expect(aThirdPartyIsInPlay('nothing is moving', 'There is no owner. What would change that?')).toBe(false);
  });

  it('tells the model to keep the rest of its reply', () => {
    const { HERS_TO_DRAW } = require('./a-verdict-is-not-a-question');
    expect(HERS_TO_DRAW).toMatch(/Everything else in the reply stays as you wrote it/);
    expect(HERS_TO_DRAW).toMatch(/put it to them as a question and let them accept or refuse it/);
  });
});
