import { contextGaps, contextChatPrompt } from './the-context-chat';

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
  brief: 'the scope is agreed and delivery is on the dates we set',
  partyCount: 3,
  perPersonObjectiveCount: 3,
  openDocumentCount: 2,
};

describe('what is missing', () => {
  it('a ground with everything has nothing to ask about', () => {
    expect(contextGaps(FULL)).toEqual([]);
  });

  it('the ninety-day ground from one sentence is caught on every count', () => {
    // The real failure: a duration with no rhythm, no success definition, one party,
    // no objectives and nothing in writing.
    const gaps = contextGaps({
      timelineDays: null, cadence: null, brief: null,
      partyCount: 1, perPersonObjectiveCount: 0, openDocumentCount: 0,
    });
    expect(gaps.map(g => g.key)).toEqual(['timeline', 'cadence', 'success', 'parties', 'objectives', 'documents']);
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
    timelineDays: null, cadence: null, brief: null,
    partyCount: 1, perPersonObjectiveCount: 0, openDocumentCount: 0,
  }));

  it('it is not a check-in, and does not reach the report', () => {
    expect(prompt).toContain('This is not a check-in.');
    expect(prompt).toMatch(/will appear in the report - it will not/);
  });

  it('it refuses to be a place to say things about a person', () => {
    /**
     * THE ONE THAT MATTERS. A lead telling this thing that somebody is the problem,
     * and it recording that, turns the Context tab into a file on an employee with a
     * chat interface. This product exists to be the opposite of that.
     */
    expect(prompt).toContain('This is not about a person.');
    // The destination is asserted in its own test below, precisely, because being
    // vague here is what let the model relocate it to a check-in.
    expect(prompt).toMatch(/point them at the ONE place that is for it/);
    expect(prompt).toMatch(/Do not record it here and do not draw them out on it/);
  });

  it('names the ONE place it does belong, and it is not a check-in', () => {
    /**
     * FOUND BY RUNNING IT. The first version said "a closed context note where the
     * product says who can read it", and the model paraphrased that into "a private
     * note later, during a check-in" - which points a lead at the person's OWN account
     * of their own work, the single place their manager's opinion must never go.
     *
     * Vague about the destination means the model picks one.
     */
    expect(prompt).toMatch(/private context note further down this same Context page/)
    expect(prompt).toMatch(/Do not say it belongs in a check-in/)
    expect(prompt).toMatch(/that person's own account of their own work/)
  })

  it('and it names what that would make the product, so the instruction has a reason', () => {
    // An instruction with no reason is the one a model talks itself out of.
    expect(prompt).toMatch(/a file on somebody with a chat interface/);
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
