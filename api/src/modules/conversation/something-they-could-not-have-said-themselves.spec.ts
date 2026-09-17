import { somethingTheyCouldNotHaveSaid } from './something-they-could-not-have-said-themselves';

/*
 * Part 5, her words: "the give something isn't really working well here." Facts they already hold,
 * fired rarely, and a ten-minute conversation that gives back one fact.
 */
describe('something they could not have said themselves', () => {
  const base = {
    answersSoFar: 4,
    gaveSomethingAlready: false,
    somethingBetterFired: false,
  };

  it('does the arithmetic nobody in the room can do alone', () => {
    const out = somethingTheyCouldNotHaveSaid({
      ...base,
      whole: { name: 'units', target: 10000 },
      parts: [{ target: 2000, theirs: false }, { target: 3000, theirs: true }],
    })!;
    expect(out).toContain('5,000');
    expect(out).toContain('10,000');
    expect(out).toMatch(/5,000 short/);
    expect(out).toMatch(/never as a fact about them/);
  });

  it('and works out the run rate, which is two numbers they gave and never divided', () => {
    const out = somethingTheyCouldNotHaveSaid({
      ...base, theirTarget: 3000, standsAt: 900, daysLeft: 70,
    })!;
    expect(out).toContain('900');
    expect(out).toContain('3,000');
    expect(out).toMatch(/10 weeks left/);
    expect(out).toMatch(/210 a week/);
    expect(out).toMatch(/not a verdict/);
  });

  it('stays quiet when a better source already fired', () => {
    expect(somethingTheyCouldNotHaveSaid({
      ...base, somethingBetterFired: true, whole: { name: 'units', target: 10000 },
      parts: [{ target: 2000, theirs: false }, { target: 3000, theirs: true }],
    })).toBeNull();
  });

  it('and once this session has already given something back', () => {
    expect(somethingTheyCouldNotHaveSaid({
      ...base, gaveSomethingAlready: true, theirTarget: 3000, standsAt: 900, daysLeft: 70,
    })).toBeNull();
  });

  it('and early on, when the session has not gone far enough to be silent', () => {
    expect(somethingTheyCouldNotHaveSaid({
      ...base, answersSoFar: 2, theirTarget: 3000, standsAt: 900, daysLeft: 70,
    })).toBeNull();
  });

  it('and where the parts already reach the whole, because then there is nothing to say', () => {
    expect(somethingTheyCouldNotHaveSaid({
      ...base, whole: { name: 'units', target: 4000 },
      parts: [{ target: 2000, theirs: false }, { target: 3000, theirs: true }],
    })).toBeNull();
  });

  it('and never hands back one number they just said', () => {
    /* One part is not arithmetic, it is their own figure repeated. */
    expect(somethingTheyCouldNotHaveSaid({
      ...base, whole: { name: 'units', target: 10000 }, parts: [{ target: 3000, theirs: true }],
    })).toBeNull();
  });
});

/*
 * AND IT IS UNDER THE OTHER THREE, NOT BESIDE THEM.
 *
 * The rule that only one give-back reaches a turn is the one thing about this that was already
 * right. This is the floor: it runs only where the better three came back empty.
 */
describe('the floor sits under the three better sources', () => {
  const src = require('fs')
    .readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('returns nothing at all when one of the three fired', () => {
    expect(src).toMatch(/if \(theOneThingBack\) return '';/);
  });

  it('and reaches the model when they did not', () => {
    expect(src).toMatch(/theOneThingBack, theFloorGiveBack, numbersAndOwners\.whoCarries/);
    expect(src).toMatch(/somethingTheyCouldNotHaveSaid\(\{/);
  });

  it('and where it stands is read only from a figure said beside a now-word', () => {
    /* Their target handed back as their progress is the fault this is built to avoid. */
    expect(src).toMatch(/\.filter\(\(c: string\) => saysWhereItStands\(c\)\)/);
  });

  it('and it is named in the block log like everything else', () => {
    expect(src).toMatch(/\['theFloorGiveBack', theFloorGiveBack\]/);
  });
});
