import { askWhereTheNumberStands, saysWhereItStands } from './a-number-with-no-starting-point';

/*
 * 3.4: "'10,000 units' was accepted with no follow-up: what is it now, who confirms it, by when. A
 * number with no baseline cannot be checked next session, which is what makes session 2 worth
 * anything."
 */
describe('a number with no starting point', () => {
  const theirs = { name: 'units of tea sold in Abuja', target: 10000, theirs: true, baselineKnown: false };

  it('asks where the number stands, once, in plain words', () => {
    const out = askWhereTheNumberStands([theirs], 'We are aiming at 10,000 units this year.')!;
    expect(out).toContain('10,000');
    expect(out).toContain('units of tea sold in Abuja');
    expect(out).toMatch(/ASK WHERE IT IS NOW/);
  });

  it('and never suggests a figure, and takes "I do not know"', () => {
    const out = askWhereTheNumberStands([theirs], 'We are aiming at 10,000 units.')!;
    expect(out).toMatch(/"I do not know" is a real answer/);
    expect(out).toMatch(/never suggest a figure yourself/);
  });

  it('says nothing once a starting point is known', () => {
    expect(askWhereTheNumberStands([{ ...theirs, baselineKnown: true }], 'Anything else?')).toBeNull();
  });

  it('says nothing about a number that is somebody else\'s to move', () => {
    expect(askWhereTheNumberStands([{ ...theirs, theirs: false }], 'Anything else?')).toBeNull();
  });

  it('and nothing at all on the turn where they have just said where it stands', () => {
    for (const said of [
      'We are at 1,200 units sold so far.',
      'I am at about 900 units.',
      'It currently stands at 40 shops.',
      'We have done 60 of them already.',
    ]) {
      expect(saysWhereItStands(said)).toBe(true);
      expect(askWhereTheNumberStands([theirs], said)).toBeNull();
    }
  });

  it('and a sentence with no figure in it is not a starting point', () => {
    expect(saysWhereItStands('It is going well so far.')).toBe(false);
    expect(askWhereTheNumberStands([theirs], 'It is going well so far.')).not.toBeNull();
  });

  it('asks about one number, never the list', () => {
    const out = askWhereTheNumberStands(
      [theirs, { name: 'shops opened', target: 40, theirs: true, baselineKnown: false }],
      'Two things this year.',
    )!;
    expect(out).toContain('units of tea sold in Abuja');
    expect(out).not.toContain('shops opened');
    expect(out).toMatch(/Ask about this one only/);
  });
});
