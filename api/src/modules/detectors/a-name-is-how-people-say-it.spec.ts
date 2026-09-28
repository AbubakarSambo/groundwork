import { namesFor, turnMentions, NEVER_A_NAME, ENOUGH_OF_A_TITLE } from './a-name-is-how-people-say-it';

const words = (title: string) => title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length >= 3 && !['the', 'and', 'for', 'while'].includes(w));
const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/*
 * A whole fictional firm: eleven people, seven subjects, twenty-eight conversations about three
 * named projects, and the contribution table came back 27 ASSIGNED / 0 STATED / 0 REFERENCED.
 */
const sub = (externalId: string, title: string) => ({ externalId, title, words: words(title) });
const SUBJECTS = [
  sub('prj-atlas', 'Atlas market entry study'),
  sub('prj-borno', 'Borno agricultural value chain review'),
  sub('prj-chad', 'Chad logistics diagnostic'),
  sub('obj-quality', 'Hold delivery quality while the book grows'),
];
const names = namesFor(SUBJECTS);
const mentions = (text: string, id: string) => {
  const s = SUBJECTS.find((x) => x.externalId === id)!;
  return turnMentions(flat(text), s.words, names.get(id) ?? []);
};

describe('a name is how people say it', () => {
  it('knows a project name from an ordinary work word', () => {
    expect(names.get('prj-atlas')).toEqual(['atlas']);
    expect(names.get('prj-chad')).toEqual(['chad']);
  });

  /*
   * The first version counted any word unique to one title, which made "market" and "entry" names
   * and would have attached every sentence about market conditions to the Atlas project.
   */
  it('does not make a lower-cased word a name just because it is rare', () => {
    expect(names.get('prj-atlas')).not.toContain('market');
    expect(names.get('prj-borno')).not.toContain('agricultural');
  });

  it('ignores capitalisation where a title is in title case and it tells us nothing', () => {
    const titled = sub('t', 'Seed Potato Multiplication Pilot');
    expect(namesFor([titled]).get('t')).toEqual([]);
  });

  it('never lets the ordinary words of consulting work be a name', () => {
    expect(names.get('obj-quality')).not.toContain('delivery');
    expect(names.get('obj-quality')).not.toContain('quality');
    for (const w of ['delivery', 'project', 'quality', 'review', 'study', 'client']) expect(NEVER_A_NAME.has(w)).toBe(true);
  });

  /* The sentence people actually say. */
  it('matches a bare project name', () => {
    expect(mentions('Atlas is two weeks behind on the analysis.', 'prj-atlas')).toBe(true);
    expect(mentions('I am on Borno and Chad as well.', 'prj-borno')).toBe(true);
    expect(mentions('I am on Borno and Chad as well.', 'prj-chad')).toBe(true);
  });

  it('does not match a project that was not named', () => {
    expect(mentions('Atlas is two weeks behind.', 'prj-chad')).toBe(false);
    expect(mentions('The analysis is late.', 'prj-atlas')).toBe(false);
  });

  /* The original rule, kept, because when it fires it is certain. */
  it('still matches a full title however it is phrased', () => {
    const billing = sub('b', 'Rebuild the billing service');
    const n = namesFor([billing, ...SUBJECTS]);
    expect(turnMentions(flat('the billing service rebuild is slipping'), billing.words, n.get('b') ?? [])).toBe(true);
  });

  /* And a descriptive title with no name in the sentence still needs enough of itself. */
  it('does not let one ordinary word drag in a descriptive objective', () => {
    expect(mentions('Delivery is under pressure everywhere.', 'obj-quality')).toBe(false);
    expect(ENOUGH_OF_A_TITLE).toBe(0.5);
  });

  it('matches a descriptive title when enough of it is there with something distinctive', () => {
    const s = sub('s', 'Seed potato multiplication pilot');
    const n = namesFor([s, ...SUBJECTS]);
    expect(turnMentions(flat('the seed potato pilot is running'), s.words, n.get('s') ?? [])).toBe(true);
  });
});
