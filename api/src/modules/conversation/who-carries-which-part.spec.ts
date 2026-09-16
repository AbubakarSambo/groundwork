import { askWhoCarriesWhichPart, alreadyAskedWhoCarriesWhat } from './who-carries-which-part';

/*
 * 3.2: "Your chat had three people named and no statement of who owns which part. The chat never
 * asked." Her own run: Sahar and Amina on the check-in, 10,000 units with no owners, and the only
 * thing that ever mentioned it was the note at the close.
 */
describe('who carries which part', () => {
  const has = {
    sharedNumbers: [{ name: 'units of tea sold in Abuja', target: 10000 }],
    peopleWithANumberOfTheirOwn: 0,
    peopleNamed: ['Sahar', 'Amina'],
    theyRunIt: true,
    alreadyAsked: false,
  };

  it('asks how the number splits, naming the people and the figure', () => {
    const out = askWhoCarriesWhichPart(has)!;
    expect(out).toContain('10,000');
    expect(out).toContain('Sahar and Amina');
    expect(out).toMatch(/ASK WHO CARRIES WHICH PART/);
  });

  it('and never proposes a split of its own', () => {
    const out = askWhoCarriesWhichPart(has)!;
    expect(out).toMatch(/do not propose a split/);
    expect(out).toMatch(/never suggest a number for anybody/);
    expect(out).toMatch(/not been decided, that is the more useful answer/);
  });

  it('is the lead\'s question and nobody else\'s', () => {
    expect(askWhoCarriesWhichPart({ ...has, theyRunIt: false })).toBeNull();
  });

  it('says nothing once anybody holds a number of their own', () => {
    expect(askWhoCarriesWhichPart({ ...has, peopleWithANumberOfTheirOwn: 1 })).toBeNull();
  });

  it('says nothing where there is nothing to divide', () => {
    expect(askWhoCarriesWhichPart({ ...has, sharedNumbers: [] })).toBeNull();
    expect(askWhoCarriesWhichPart({ ...has, sharedNumbers: [{ name: 'steady progress', target: null }] })).toBeNull();
    expect(askWhoCarriesWhichPart({ ...has, peopleNamed: ['Sahar'] })).toBeNull();
  });

  it('and never twice in one session', () => {
    expect(askWhoCarriesWhichPart({ ...has, alreadyAsked: true })).toBeNull();
    expect(alreadyAskedWhoCarriesWhat(['So how does that 10,000 split between them?'])).toBe(true);
    expect(alreadyAskedWhoCarriesWhat(['Who carries which part of it?'])).toBe(true);
    expect(alreadyAskedWhoCarriesWhat(['What would tell you that is done?'])).toBe(false);
  });
});

/*
 * AND IT REACHES THE MODEL, WHICH IS THE HALF THAT HAS BEEN MISSING EVERY OTHER TIME.
 *
 * Three separate things in this repo were built, tested and never joined into the prompt. The
 * question is asked in code and joined in the same commit, and both halves are pinned here.
 */
describe('both number questions reach the conversation', () => {
  const src = require('fs')
    .readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('who carries which part and where it stands are both in the joined prompt', () => {
    expect(src).toMatch(/numbersAndOwners\.whoCarries, numbersAndOwners\.whereItStands/);
    expect(src).toMatch(/askWhoCarriesWhichPart\(\{/);
    expect(src).toMatch(/askWhereTheNumberStands\(/);
  });

  it('only one of the two ever fires on a turn', () => {
    /* Two instructions about the same number in one turn is the briefing fault that
       one-thing-back-not-three exists to stop. */
    expect(src).toMatch(/whoCarries \? \{ whoCarries, whereItStands: '' \} : \{ whoCarries: '', whereItStands \}/);
  });

  it('and neither is built at all for anybody but the lead', () => {
    expect(src).toMatch(/if \(!leadsSession\) return \{ whoCarries: '', whereItStands: '' \}/);
  });

  it('and both are named in the per-turn block log, so a dead one is visible', () => {
    expect(src).toMatch(/\['whoCarriesWhichPart', numbersAndOwners\.whoCarries\]/);
    expect(src).toMatch(/\['whereTheNumberStands', numbersAndOwners\.whereItStands\]/);
  });
});
