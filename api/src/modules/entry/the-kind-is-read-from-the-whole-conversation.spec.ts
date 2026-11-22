import { theClassifierPrompt, theWholeConversation } from './which-situation-this-is';

/*
 * THE KIND IS READ FROM THE WHOLE CONVERSATION, BY WHAT IT MEANS (Hafsah's setup, 22 November 2026). "Weekly updates on bills from
 * Abubakar Sambo and my national assembly team" was read as "Collect what's owed": the reading saw her first message alone, cut at 400
 * characters, and matched "bills" against the money owed in a situation's description. It is given the whole conversation now, both
 * sides, and told to read each word by what the rest is about. No word list: the model understands, the prompt says how to read.
 */
const CONVERSATION = [
  { role: 'user', content: 'weekly updates on bills from Abubakar Sambo abu@x.test and my national assembly team, Mondays from 4pm' },
  { role: 'assistant', content: 'So you want a weekly update from Abubakar and your team on the bills going through the national assembly. Is that right?' },
  { role: 'user', content: 'Yes, the bills we are tracking through parliament.' },
];

describe('the reading of the situation and the kind', () => {
  it('is given the whole conversation, both sides, in order', () => {
    const words = theWholeConversation(CONVERSATION);
    expect(words.split('\n')).toEqual([
      `They said: ${CONVERSATION[0].content}`,
      `Groundwork said: ${CONVERSATION[1].content}`,
      `They said: ${CONVERSATION[2].content}`,
    ]);
    const prompt = theClassifierPrompt(words);
    for (const turn of CONVERSATION) expect(prompt).toContain(turn.content);
  });

  it('is not cut at the first few hundred characters', () => {
    const long = theWholeConversation([{ role: 'user', content: 'x'.repeat(380) }, { role: 'user', content: 'the bills going through parliament' }]);
    expect(theClassifierPrompt(long)).toContain('the bills going through parliament');
  });

  it('is told to read what they mean, by everything they said, and never to match a word against a description', () => {
    const prompt = theClassifierPrompt('x');
    expect(prompt).toContain('READ WHAT THEY MEAN, NOT THE WORDS ON THEIR OWN.');
    expect(prompt).toContain('never by a word that also appears in a description');
    expect(prompt).toContain('people giving regular updates on their own work is getting updates from a team, whatever subject the updates are about');
  });
});
