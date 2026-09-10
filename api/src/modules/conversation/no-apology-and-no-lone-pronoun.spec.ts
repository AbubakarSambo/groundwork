import { screen, pronounWithNobodyNamed } from './nothing-invented-reaches-them';

const SAID = ['less than 5 complaints a week', 'i dont understand'];
const ROSTER = [...SAID, 'Jamie', 'Okafor', 'Abubak', 'Sambo'];

describe('an apology is dropped, the rest of the turn stands', () => {
  it('drops the apology sentence', () => {
    const r = screen('My apologies, that was unclear. What would you want Jamie to be able to point to?', ROSTER, null, SAID);
    expect(r.text).toBe('What would you want Jamie to be able to point to?');
    expect(r.hits.map((h) => h.check)).toEqual(['an apology']);
  });
  it('"My mistake." too', () => {
    expect(screen('My mistake. Which number are you working towards?', ROSTER, null, SAID).text).toBe('Which number are you working towards?');
  });
});

describe('a pronoun with nobody named is dropped', () => {
  it('him with no him anywhere in the conversation', () => {
    expect(pronounWithNobodyNamed('What would you want him to be able to point to at the end of this?', SAID)).toBe(true);
    const r = screen('Less than 5 complaints a week. What would you want him to be able to point to at the end of this?', ROSTER, null, SAID);
    expect(r.text).toBe('Less than 5 complaints a week.');
    expect(r.hits[0].check).toBe('a pronoun with nobody named');
  });
  it('a name on the roster is not a name in the conversation', () => {
    expect(pronounWithNobodyNamed('What would you want him to point to?', ['Jamie is the new hire'])).toBe(false);
    expect(pronounWithNobodyNamed('What would you want him to point to?', [])).toBe(true);
  });
  it('a role counts as naming', () => {
    expect(pronounWithNobodyNamed('What would you want the new hire to be able to show, and what would you want him to own?', SAID)).toBe(false);
  });
  it('the conversation names them and the pronoun stands', () => {
    const r = screen('What would you want him to point to?', ROSTER, null, [...SAID, 'Jamie, the new hire, is to get 10 clients']);
    expect(r.hits).toEqual([]);
  });
});
