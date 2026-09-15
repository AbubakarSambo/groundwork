import { asksForAShapeWithoutShowingOne as bare, SHOW_WHAT_ONE_LOOKS_LIKE } from './a-question-that-invents-a-shape-shows-one';

/*
 * "It doesn't give examples of the responses it expects." Read off a live check-in: "When you say
 * 10,000 units are sold, what would tell you, or anyone else looking, that this goal has been met?"
 */
describe('a question that asks somebody to invent a shape shows one', () => {
  it('catches the question that was actually asked', () => {
    expect(bare('When you say 10,000 units are sold, what would tell you, or anyone else looking, that this goal has been met?')).toBe(true);
  });

  it('and the other ways of asking the same thing', () => {
    expect(bare('How would you know this was done?')).toBe(true);
    expect(bare('What does good look like here?')).toBe(true);
    expect(bare('What evidence would exist if this landed?')).toBe(true);
  });

  it('but not once an example is in the sentence', () => {
    expect(bare('What would tell you this was met - for instance the money in the account, or a signed order?')).toBe(false);
    expect(bare('How would you know it is done? Something like a delivery note, or the invoice being paid.')).toBe(false);
    expect(bare('What does good look like - even just a date somebody else could check?')).toBe(false);
  });

  it('and never on a plain question, which an example would patronise', () => {
    expect(bare('How is it going?')).toBe(false);
    expect(bare('Who else is involved in making that happen?')).toBe(false);
    expect(bare('What is in the way of Amir getting going?')).toBe(false);
    expect(bare('What will you do about this, and by when?')).toBe(false);
  });

  it('the instruction says to build the examples from their own words, not from a list', () => {
    expect(SHOW_WHAT_ONE_LOOKS_LIKE).toMatch(/BUILD THEM FROM WHAT THEY HAVE ALREADY TOLD YOU/);
    expect(SHOW_WHAT_ONE_LOOKS_LIKE).toMatch(/units of tea in Abuja/);
    expect(SHOW_WHAT_ONE_LOOKS_LIKE).toMatch(/never as a list to pick from/);
  });

  it('and to keep the question, so the retry does not answer it for them', () => {
    expect(SHOW_WHAT_ONE_LOOKS_LIKE).toMatch(/Keep the question itself/);
  });
});
