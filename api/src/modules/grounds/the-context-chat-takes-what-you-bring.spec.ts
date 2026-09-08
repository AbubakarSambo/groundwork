import { contextChatPrompt } from './the-context-chat';

/**
 * THE CONTEXT CHAT ASKED ITS QUESTIONS AND HAD NO ANSWER FOR SOMEBODY WITH SOMETHING TO ADD.
 *
 * "I don't get what this long text on the context chat is for, and why I can't update the sections
 * on the context page via the chat as well as the docs and give context on the docs. Can I say a
 * to-do list, can I say OKRs?"
 *
 * It was written as a gap-filling interview: it read what setup had missed and asked for it, in
 * order. That is a good conversation to have once and a bad one to be stuck in, because the things
 * a lead actually arrives with - a revised deadline, a list of what has to be done, a document, a
 * new person - were none of its questions.
 *
 * Each of them now has a named landing place, which is the part that makes it usable rather than
 * merely polite: a conversation that says "noted" and changes nothing is worse than one that
 * refuses.
 */
describe('what the context chat says it can take', () => {
  const prompt = contextChatPrompt('A new hire starting', 'NEW_HIRE', []);

  it('names the things a lead turns up with', () => {
    for (const thing of [
      'SOMETHING THAT HAS CHANGED',
      'MORE OF WHAT SUCCESS LOOKS LIKE',
      'A GOAL OR A TARGET',
      'A LIST OF THINGS TO BE DONE',
      'A DOCUMENT',
      'SOMEBODY NEW WHO SHOULD BE IN THIS',
    ]) {
      expect(prompt).toContain(thing);
    }
  });

  it('and says where each one lands', () => {
    expect(prompt).toContain('goes in the change log on this page, dated and kept');
    expect(prompt).toContain('There is a button beside the message box');
    expect(prompt).toContain('Setup, the first band');
  });

  it('does not claim it can mark a commitment done', () => {
    /* A commitment's state comes from the person who owns it, in their own check-in. A setup
       conversation marking work complete would be the lead answering for them. */
    expect(prompt).toContain('this conversation cannot mark anything done, and nobody else can either');
  });

  it('and does not offer to add a person, which sends an email in somebody\'s name', () => {
    expect(prompt).toContain('You cannot add them from here');
  });

  it('keeps the rule that overrides all of it', () => {
    /* The moment this becomes a place to say things about people it is a file on somebody with a
       chat interface. The new list must not have opened a door around that. */
    expect(prompt).toContain('If it is about a named person, rule 2 below decides and it overrides everything on this list');
    expect(prompt).toContain('This is not about a person');
  });
});
