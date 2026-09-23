import { inYourPerson } from './their-words-in-your-person';
import { screen, SentenceGate } from './nothing-invented-reaches-them';

/**
 * "I am one payment behind" said back as "I am one payment behind" made the product the one in
 * arrears (run 11, Aisha). Their copied sentence is turned to the second person; the product's own
 * first person is left alone.
 */
describe('their words, said back in the right person', () => {
  const said = ['I am one payment behind.', "I'm sorry. I will pay."];

  it('turns a copied first-person sentence round', () => {
    expect(inYourPerson('I am one payment behind. The report is ready now.', said)).toBe('You are one payment behind. The report is ready now.');
    expect(inYourPerson('I am one payment behind, and you will pay.', said)).toBe('You are one payment behind, and you will pay.');
  });

  it('turns my and me with it, and keeps a capital where the span opened the sentence', () => {
    expect(inYourPerson("I've told my supplier twice - that is on the record.", ["I've told my supplier twice."])).toBe("You've told your supplier twice - that is on the record.");
    expect(inYourPerson('You said: they never call me back.', ['They never call me back.'])).toBe('You said: they never call you back.');
  });

  it('leaves the product’s own first person alone', () => {
    expect(inYourPerson('I want to know what it shows.', said)).toBe('I want to know what it shows.');
    expect(inYourPerson('If you have it, attach it - I want to know what it shows.', ['I have the invoice.'])).toBe('If you have it, attach it - I want to know what it shows.');
  });

  it('and a span under three words, or with no first person in it, is not touched', () => {
    expect(inYourPerson('I will.', ['I will.'])).toBe('I will.');
    expect(inYourPerson('The hens are laying okay.', ['The hens are laying okay.'])).toBe('The hens are laying okay.');
  });

  it('runs in both screens: the whole reply and the stream', () => {
    expect(screen('I am one payment behind. Speak soon.', said).text).toContain('You are one payment behind.');
    const gate = new SentenceGate(said, null, said, said);
    expect(gate.push('I am one payment behind, and you will pay. Your report is ready now. ') + gate.flush()).toContain('You are one payment behind, and you will pay.');
  });
});
