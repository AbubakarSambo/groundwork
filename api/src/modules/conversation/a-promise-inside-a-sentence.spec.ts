import { aPromiseInsideASentence } from './a-promise-inside-a-sentence';
import { theAnchorNudgeLine } from './the-anchor-nudge';
import { isADeadEnd } from './a-reply-that-asks-nothing-is-a-dead-end';
import { withAQuestion } from './nobody-is-left-looking-at-a-paragraph';

/**
 * "You mentioned You will give Juma your number" read a capital in the middle of a sentence and said "You will" twice. And "What else should I know?" was
 * added to a reply that was already asking the person to do something. What a person reads, as the sentence is built.
 */
describe('a promise said inside a sentence', () => {
  it.each([
    ['You will give Juma your number', 'give Juma your number'],
    ["You'll give Juma your number", 'give Juma your number'],
    ['I will give Juma my number', 'give Juma my number'],
    ['Give Juma your number', 'give Juma your number'],
    ['send the NABG deck to Kofi', 'send the NABG deck to Kofi'],
    ['I am meeting Juma on Friday', 'I am meeting Juma on Friday'],
    ['Q4 numbers go to Amina', 'Q4 numbers go to Amina'],
  ])('%s reads "%s"', (stored, said) => {
    expect(aPromiseInsideASentence(stored)).toBe(said);
  });

  it('the nudge no longer reads a capital or a second "You will" after "You mentioned"', () => {
    expect(theAnchorNudgeLine('You will give Juma your number.')).toBe("You mentioned you would give Juma your number. I'd love to hear how it went.");
    expect(theAnchorNudgeLine('Give Juma your number')).toBe("You mentioned you would give Juma your number. I'd love to hear how it went.");
  });
});

describe('a reply that already asks the person to do something is not given "What else should I know?"', () => {
  it.each([
    'I need a little more from you before this check-in can close. Please answer one or two more questions, then write "finish" again.',
    'Thank you. Go ahead whenever you are ready.',
    'That is a lot to hold. Take your time.',
  ])('%s', (reply) => {
    expect(isADeadEnd(reply, false)).toBe(false);
    expect(withAQuestion(reply)).toBe(reply);
  });
  it('but a flat acknowledgement is still given a question', () => {
    expect(withAQuestion('You will go to their team lead directly on Monday.')).toBe('You will go to their team lead directly on Monday.\n\nWhat else should I know?');
  });
});
