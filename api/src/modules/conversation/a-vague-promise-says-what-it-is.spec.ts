import { theVaguePromiseIn, askWhatItIs, askedWhatItIs, whatTheySaidItIs, theQuestionWhatItIs, SAID_WHAT_IT_IS } from './a-vague-promise-says-what-it-is';

/* Hafsah's answer on reviews, 25 October 2026: a vague promise is asked once what "it" is, and the answer is kept in their own words. */
describe('a vague promise is asked once what it is', () => {
  it('finds a promise named only by a pronoun', () => {
    expect(theVaguePromiseIn("I'll get it to him.")).toEqual({ promise: "I'll get it to him", pronoun: 'it' });
    expect(theVaguePromiseIn('Nothing else. I will follow up on that tomorrow.')).toEqual({ promise: 'I will follow up on that tomorrow', pronoun: 'that' });
    expect(theVaguePromiseIn('I will send the quote to Paul on Friday.')).toBeNull();
    expect(theVaguePromiseIn('It is with the warehouse.')).toBeNull();
  });

  it('asks with the exact question, once in a check-in', () => {
    const ask = askWhatItIs("I'll get it to him.", []);
    expect(ask).toContain(theQuestionWhatItIs({ promise: "I'll get it to him", pronoun: 'it' }));
    expect(ask).toContain('Unless what "it" is is already clear');
    expect(askWhatItIs("I'll get it to him.", ['When you say “I’ll send it”, what is “it”?'])).toBeNull();
    expect(askedWhatItIs('When you say “I\'ll get it to him”, what is “it”?')).toBe(true);
    expect(askedWhatItIs('What happened with Juja Hardware?')).toBe(false);
  });

  it('keeps their answer word for word beside the promise it was asked about', () => {
    const turns = [
      { content: "I'll get it to him.", stage: null },
      { content: 'The signed quote for Juja Hardware', stage: SAID_WHAT_IT_IS },
    ];
    expect(whatTheySaidItIs("I'll get it to him", turns)).toBe('The signed quote for Juja Hardware');
    expect(whatTheySaidItIs('I will call Mama Pima on Thursday', turns)).toBeNull();
    expect(whatTheySaidItIs("I'll get it to him", [turns[0], { ...turns[1], stage: null }])).toBeNull();
  });
});
