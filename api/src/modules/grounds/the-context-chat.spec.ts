import { contextGaps, contextChatPrompt, openingLine, withoutTheOpeningGreeting } from './the-context-chat';

/**
 * THE CONTEXT CHAT. G37, G23.
 *
 * The plan's reason for it: "This is what stops a ground being created off one
 * sentence, which is a live defect: a real Ground 1 run produced a ninety-day ground
 * from a single answer with no duration, no rhythm and no sense of who was involved."
 *
 * Tested as text, because the wording IS the mechanism - the same lesson as
 * `between-session-notes.ts`, where the first version of the test read the source and
 * failed on its own line breaks.
 */

const FULL = {
  timelineDays: 90,
  cadence: 'FORTNIGHTLY',
  successLooksLike: 'the scope is agreed and delivery is on the dates we set',
  partyCount: 3,
  perPersonObjectiveCount: 3,
  openDocumentCount: 2,
  targetCount: 2,
  scenario: 'NEW_PROJECT',
};

describe('what is missing', () => {
  it('a ground with everything has nothing to ask about', () => {
    expect(contextGaps(FULL)).toEqual([]);
  });

  it('the ninety-day ground from one sentence is caught on every count', () => {
    // The real failure: a duration with no rhythm, no success definition, one party,
    // no objectives and nothing in writing.
    const gaps = contextGaps({
      timelineDays: null, cadence: null, successLooksLike: null,
      partyCount: 1, perPersonObjectiveCount: 0, openDocumentCount: 0,
      targetCount: 0, scenario: 'NEW_PROJECT',
    });
    /* `targets` sits after success and before anything about people: a board with no measures shows
       movement against nothing, and the document that answers it is usually already attached. */
    expect(gaps.map(g => g.key)).toEqual(['timeline', 'cadence', 'success', 'targets', 'parties', 'objectives', 'documents']);
  });

  it('duration and rhythm come first, because without them the ground cannot count itself', () => {
    // Ordered by what it costs to be without it, not by which question is easiest.
    // "Send me the brief" is the easier ask and it is not the urgent one.
    const gaps = contextGaps({ ...FULL, timelineDays: null, openDocumentCount: 0 });
    expect(gaps[0].key).toBe('timeline');
  });

  it('names the document that would settle it, rather than asking for an upload', () => {
    // "Upload something" gets nothing. "The brief you sent them" gets the brief.
    const docs = contextGaps({ ...FULL, openDocumentCount: 0 })[0];
    expect(docs.suggests).toMatch(/brief|plan|scope|terms/);
  });

  it('and asks for objectives when only some people have one', () => {
    const gaps = contextGaps({ ...FULL, perPersonObjectiveCount: 1 });
    expect(gaps.map(g => g.key)).toContain('objectives');
  });
});

describe('what the chat is told it must not do', () => {
  const prompt = contextChatPrompt('Partner delivery', 'NEW_PROJECT', contextGaps({
    timelineDays: null, cadence: null, successLooksLike: null,
    partyCount: 1, perPersonObjectiveCount: 0, openDocumentCount: 0,
    targetCount: 0, scenario: 'NEW_PROJECT',
  }));

  it('it is not a check-in, and does not reach the report', () => {
    expect(prompt).toContain('This is not a check-in.');
    expect(prompt).toMatch(/will appear in the report - it will not/);
  });

  /**
   * THIS PINNED THE OPPOSITE OF WHAT SHE ASKED FOR, AND IT PINNED IT WELL.
   *
   * The rule was: a lead who says somebody is the problem is stopped, sent to a private note box,
   * and not drawn out. The reasoning was sound - a Context tab that collects judgements about
   * people is a file on an employee with a chat interface - and it produced a conversation that
   * refused the one thing the lead came to it for.
   *
   * Hafsah, 22 September 2026: "Everything in the context chat can be used to guide and coach the
   * team and also help them where they are going wrong." And on 23 September, reading it again: "i
   * didnt forbid coaching... It seems i asked for coaching and then you did the opposite."
   *
   * The box it pointed at no longer exists either - the lead's read of a person moved into this
   * conversation on 23 September - so the rule was sending people to a control that was gone.
   *
   * WHAT REPLACES IT IS NOT NOTHING. The wall the old rule was really protecting is the one below:
   * a lead's read is kept as the lead's read, it is never handed to that person as a finding, and
   * it never enters their own check-in. Silence was one way to hold that wall. Labelling the line
   * is a better one, because it lets the lead be helped.
   */
  it('coaches rather than refusing, when a lead talks about somebody', () => {
    expect(prompt).toContain('Coach them.');
    expect(prompt).toMatch(/do not stop it and do not send them somewhere else/);
    expect(prompt).toMatch(/what they have seen, what they have already tried/);
  });

  it('and keeps the wall that the refusal was really there for', () => {
    /* Their read, labelled as theirs. Not a fact about somebody, and not their colleague's news. */
    expect(prompt).toMatch(/Record it as THEIR READ of that person/);
    expect(prompt).toMatch(/never quoted to that person as a finding/);
    expect(prompt).toMatch(/that person's own check-in/);
    expect(prompt).toMatch(/A judgement is not a fact about somebody/);
  });

  /* The box it used to send people to was deleted on 23 September 2026. A prompt that names a
     control which does not exist is worse than one that names none: it sends somebody looking. */
  it('and no longer sends them to a box that was removed', () => {
    expect(prompt).not.toMatch(/private context note further down this same Context page/);
    expect(prompt).not.toMatch(/About <that person>/);
  });

  /* Unchanged by any of this: an expectation of a named person is not an opinion about them. */
  it('and still takes what the lead expects of a named person', () => {
    expect(prompt).toMatch(/marked unseen until that person reads it/);
    expect(prompt).toMatch(/never send them to somebody else's check-in to set one/);
  });

  it('it decides nothing - what is saved is what the lead confirms', () => {
    // G24's fourth rule: extraction is confirmed rather than adopted.
    expect(prompt).toContain('You do not decide anything.');
    expect(prompt).toMatch(/Nothing is saved until they confirm/);
  });

  it('it recommends the material instead of waiting for it', () => {
    expect(prompt).toContain('RECOMMEND THE MATERIAL, DO NOT WAIT FOR IT.');
    expect(prompt).toMatch(/People do not know what counts as context/);
  });

  it('it asks one thing at a time and never twice', () => {
    expect(prompt).toMatch(/One thing at a time/);
    expect(prompt).toMatch(/Never ask twice for something they have already told you/);
  });

  it('and it is allowed to stop', () => {
    // A setup conversation that will not end teaches people to skip setup.
    expect(prompt).toMatch(/say so and stop/);
  });

  it('the gaps reach the prompt, or none of the above is doing anything', () => {
    expect(prompt).toContain('timeline:');
    expect(prompt).toContain('documents:');
  });

  it('and a ground with nothing missing says so rather than inventing a question', () => {
    const done = contextChatPrompt('Partner delivery', 'NEW_PROJECT', []);
    expect(done).toMatch(/nothing is missing that this conversation can fix/);
  });
});

/*
 * FIX 3, 30 September 2026. Driven live, item 15: a check-in that already had its length and rhythm
 * set opened with "Hello, I'm here to help you set up your Groundwork check-in. First, tell me, what
 * does doing well look like..." - a greeting, and not a word about what it already holds. The
 * prompt's own "OPEN ON THAT, NOT ON A GREETING" rule never covered duration or cadence at all
 * (`whatThisCheckInAlreadyHolds` never counted them), so the fix is the product saying them itself.
 */
describe('the opening line, written by the product from what the check-in already holds', () => {
  it('says the length and the rhythm together, exactly as an example the fix names', () => {
    expect(openingLine(84, 'WEEKLY')).toBe('This check-in runs for 12 weeks and people check in once a week.');
  });

  it('says only the length when there is no chosen rhythm yet', () => {
    expect(openingLine(84, null)).toBe('This check-in runs for 12 weeks.');
  });

  it('says only the rhythm when there is no chosen length yet', () => {
    expect(openingLine(null, 'FORTNIGHTLY')).toBe('This check-in people check in every two weeks.');
  });

  it('says nothing at all when neither is set - there is nothing yet to open on', () => {
    expect(openingLine(null, null)).toBeNull();
  });

  it('a length that is not a whole number of weeks is said in days', () => {
    expect(openingLine(10, null)).toBe('This check-in runs for 10 days.');
  });
});

describe('the greeting a model still adds at the start of an opening turn is dropped', () => {
  it('drops a self-introduction that opens the reply', () => {
    expect(withoutTheOpeningGreeting(
      "Hello, I'm here to help you set up your Groundwork check-in. What does doing well look like here?",
    )).toBe('What does doing well look like here?');
  });

  it('drops a bare greeting word too', () => {
    expect(withoutTheOpeningGreeting('Hi! What does doing well look like here?')).toBe('What does doing well look like here?');
  });

  it('leaves a reply alone when it does not open with a greeting', () => {
    expect(withoutTheOpeningGreeting('What does doing well look like here?')).toBe('What does doing well look like here?');
  });

  it('does not touch a "hello" that shows up answering something the lead said, not at the start', () => {
    expect(withoutTheOpeningGreeting('Got it. He said hello to the new starter on their first day.'))
      .toBe('Got it. He said hello to the new starter on their first day.');
  });

  /*
   * DRIVEN LIVE, 30 September 2026: the model wrote TWO greeting sentences in a row - a bare "Hello!"
   * followed by a self-introduction - and a single strip only removed the first, leaving "I'm here to
   * help you set up your check-in." as the first thing the lead actually read.
   */
  it('drops a run of more than one greeting sentence, not only the first', () => {
    expect(withoutTheOpeningGreeting(
      'Hello! I\'m here to help you set up your "old15 check-in" check-in. To start, what does success look like for this work?',
    )).toBe('To start, what does success look like for this work?');
  });
});
