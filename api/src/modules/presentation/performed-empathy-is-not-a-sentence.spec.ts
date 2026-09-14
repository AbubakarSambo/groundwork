import { withoutPerformedEmpathy, forHumans } from './outbound';

/**
 * The prompt has banned these by name for eighteen versions: "I understand", "I hear you", "That is
 * a really important insight", "It takes courage to name that". They perform empathy, add nothing to
 * the record and delay the question.
 *
 * A list of exact phrases is the one kind of rule that does not need a model to remember it. The
 * judgement around it - when to press, when to offer a reading, whose version goes first - stays in
 * the prompt, because none of that is a list.
 */
describe('a sentence that is only filler goes', () => {
  it('drops the ones the prompt names', () => {
    expect(withoutPerformedEmpathy('That is a really important insight. What did you do next?'))
      .toBe('What did you do next?');
    expect(withoutPerformedEmpathy('It takes courage to name that. Who else knows?'))
      .toBe('Who else knows?');
    expect(withoutPerformedEmpathy('I understand. What happened after that?'))
      .toBe('What happened after that?');
  });
});

describe('an opener is cut, and the sentence it opened survives', () => {
  it('keeps what was actually said', () => {
    expect(withoutPerformedEmpathy('I understand, the finance sign-off is still stuck.'))
      .toBe('The finance sign-off is still stuck.');
    expect(withoutPerformedEmpathy('That makes sense, you asked twice already.'))
      .toBe('You asked twice already.');
  });
});

describe('and it never takes a fact with it', () => {
  /*
   * THE REASON THIS IS WHOLE-SENTENCE. "It sounds like the finance sign-off is stuck" carries a
   * fact. Cutting the clause to obey the ban would delete the fact, inside a record somebody is
   * going to be read against.
   */
  it('leaves a sentence that merely starts the same way', () => {
    const said = 'It sounds like the finance sign-off is stuck.';
    expect(withoutPerformedEmpathy(said)).toBe(said);
  });

  it('leaves ordinary sentences alone', () => {
    for (const said of [
      'What did they say when you asked?',
      'You said the launch slipped to March.',
      'I understand the contract runs to June.',
    ]) expect(withoutPerformedEmpathy(said)).toBe(said);
  });
});

describe('it runs on everything a person reads', () => {
  it('is part of forHumans', () => {
    expect(forHumans('I hear you. What is in the way now?')).toBe('What is in the way now?');
  });
});
