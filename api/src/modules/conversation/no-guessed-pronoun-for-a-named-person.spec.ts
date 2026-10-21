import { screen, SentenceGate } from './nothing-invented-reaches-them';
import { withoutAGuessedPronoun } from './no-guessed-pronoun-for-a-named-person';
import { whatIsNotPlainIn } from '../reports/a-product-sentence-is-plain';

const ROSTER = ['Amani Wekesa', 'Jamie Okafor', 'Rukia Hassan', 'I run sales for the team'];
const pronounRules = (t: string) => whatIsNotPlainIn(t).filter((r) => r.rule.startsWith('a gendered pronoun'));

describe('Groundwork does not give a named person a pronoun it was never told', () => {
  it('writes the name where she stood', () => {
    const r = screen('Amani said the cookers go out on 9 October. Did she say who signs for them?', ROSTER, 'Rukia', []);
    expect(r.text).toBe('Amani said the cookers go out on 9 October. Did Amani say who signs for them?');
    expect(pronounRules(r.text)).toEqual([]);
  });
  it('writes the name and the possessive for his and her', () => {
    expect(screen('Jamie owns the van. What is his target? Who could ask her about it?', ROSTER, 'Rukia', []).text)
      .toBe("Jamie owns the van. What is Jamie's target? Who could ask Jamie about it?");
    expect(screen('Jamie sent the plan. Her deadline is Friday.', ROSTER, 'Rukia', []).text)
      .toBe("Jamie sent the plan. Jamie's deadline is Friday.");
  });
  it('leaves their own words alone, even inside a turn that is rewritten', () => {
    const r = screen('Amani told you "she will sign on Friday". What would she need from you?', ROSTER, 'Rukia', []);
    expect(r.text).toBe('Amani told you "she will sign on Friday". What would Amani need from you?');
  });
  it('keeps the pronoun when pronouns are on record', () => {
    const said = [...ROSTER, "Amani's pronouns are she/her"];
    expect(screen('Did she say who signs?', said.concat([]), 'Rukia', []).text).toBe('Did she say who signs?');
    expect(withoutAGuessedPronoun('Amani delivered. Did she sign?', '', said)).toBe('Amani delivered. Did she sign?');
  });
  it('does nothing when no name comes before the pronoun in the turn', () => {
    expect(screen('What would the client want her to see?', ROSTER, 'Rukia', ['the client']).text).toBe('What would the client want her to see?');
  });
  it('never uses the reader\'s own name as the person talked about', () => {
    expect(screen('Rukia, what would she do?', ROSTER, 'Rukia', []).text).toBe('Rukia, what would she do?');
  });
  it('the stream does the same, sentence by sentence', () => {
    const gate = new SentenceGate(ROSTER, 'Rukia', []);
    const out = gate.push('Jamie sent the plan. Did he say when? ') + gate.push('Okay. ') + gate.flush();
    expect(out).toContain('Did Jamie say when?');
    expect(pronounRules(out)).toEqual([]);
  });
  it('the plain-sentence check names a guessed pronoun, and not one inside somebody\'s quotes', () => {
    expect(pronounRules('Did she sign the order?').length).toBe(1);
    expect(pronounRules('Amani said "she will sign".')).toEqual([]);
    expect(pronounRules('Did Amani sign the order?')).toEqual([]);
  });
});

describe('a business is not a person (Drop Access, 16 October)', () => {
  it('"Jane Mwende at Savannah Cafe ... sent her a quote" never becomes "sent Cafe a quote"', () => {
    const { withoutAGuessedPronoun } = require('./no-guessed-pronoun-for-a-named-person');
    const out = withoutAGuessedPronoun('So you sent her a quote for 6 units.', 'I sent Jane Mwende at Savannah Cafe the price list.', ['I sent Jane Mwende at Savannah Cafe the price list.']);
    expect(out).not.toMatch(/Cafe/);
    expect(out).toMatch(/Mwende|Jane/);
  });
});
