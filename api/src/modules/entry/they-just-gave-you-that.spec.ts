import { theyJustPastedSomething, withoutAskingForWhatTheyGave, A_PASTE_IS_AT_LEAST } from './they-just-gave-you-that';

const brief = 'x'.repeat(A_PASTE_IS_AT_LEAST + 50);

describe('they just gave you that', () => {
  it('knows a paste from a mention of one', () => {
    expect(theyJustPastedSomething(brief)).toBe(true);
    expect(theyJustPastedSomething('I have a brief I can send you.')).toBe(false);
    expect(theyJustPastedSomething('one\ntwo\nthree\nfour')).toBe(true);
  });

  /* The actual reply, from the run this came from. */
  it('takes out the sentence asking for what is already on the screen', () => {
    const said = 'This is a detailed brief. You can upload or paste that here so it is kept with what you shared. Who within each agribusiness will be checking in, and what is your part in making this happen?';
    const out = withoutAskingForWhatTheyGave(said);
    expect(out).not.toMatch(/upload or paste/i);
    expect(out).toContain('This is a detailed brief.');
    expect(out).toContain('Who within each agribusiness will be checking in');
  });

  it('leaves a reply that asks for nothing exactly as it was', () => {
    const said = 'Understood. How often should this happen, and over what period?';
    expect(withoutAskingForWhatTheyGave(said)).toBe(said);
  });

  /* A person typing into silence is worse than a redundant sentence. */
  it('never strips a reply down to nothing', () => {
    const said = 'You can upload or paste that here.';
    expect(withoutAskingForWhatTheyGave(said)).toBe(said);
  });
});
