import { movedTheirTargetToWhereTheyAre, A_STANDING_IS_NOT_A_TARGET } from './where-you-are-is-not-what-you-aim-at';

/*
 * Read in a browser on a live session 2:
 *
 *   SHE: "The supermarket chain went to Sahar in the end, so my 3000 is short. I am at about 900."
 *   IT:  "The supermarket chain moving to Sahar means your 3000-unit target is now 900."
 */
describe('where you are is not what you aim at', () => {
  it('catches the sentence that moved the goalpost', () => {
    const out = movedTheirTargetToWhereTheyAre(
      'The supermarket chain moving to Sahar means your 3000-unit target is now 900. What changed?',
      900,
      3000,
    );
    expect(out).toBe('The supermarket chain moving to Sahar means your 3000-unit target is now 900.');
  });

  it('and the other ways of saying the same thing', () => {
    for (const said of [
      'So your goal drops to 900.',
      'That means the number becomes 900.',
      'Your target is 900 then.',
    ]) {
      expect(movedTheirTargetToWhereTheyAre(said, 900, 3000)).toBeTruthy();
    }
  });

  it('leaves alone the correct version, which is what the give-back says', () => {
    for (const fine of [
      'You are at 900 of your 3,000.',
      'That is 900 towards the 3,000 target.',
      'So 900 against a target of 3000. What would it take to close that?',
    ]) {
      expect(movedTheirTargetToWhereTheyAre(fine, 900, 3000)).toBeNull();
    }
  });

  it('and says nothing where there is no target or no standing', () => {
    expect(movedTheirTargetToWhereTheyAre('Your target is now 900.', null, 3000)).toBeNull();
    expect(movedTheirTargetToWhereTheyAre('Your target is now 900.', 900, null)).toBeNull();
  });

  it('and nothing where they have passed the target, since that is a different conversation', () => {
    expect(movedTheirTargetToWhereTheyAre('Your target is now 3200.', 3200, 3000)).toBeNull();
  });

  it('the instruction names both numbers and refuses to restate the target', () => {
    const say = A_STANDING_IS_NOT_A_TARGET(900, 3000);
    expect(say).toContain('900');
    expect(say).toContain('3,000');
    expect(say).toMatch(/A target only changes when somebody says it has changed/);
  });
});

/*
 * AND IT RUNS ON THE REPLY BEFORE ANYBODY READS IT.
 */
describe('the guard is in the chain', () => {
  const src = require('fs')
    .readFileSync(require('path').join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('checks the reply and asks again when it moved the target', () => {
    expect(src).toMatch(/movedTheirTargetToWhereTheyAre\(screened\.text, standsAt, target\)/);
    expect(src).toMatch(/A_STANDING_IS_NOT_A_TARGET\(standsAt, target\)/);
  });

  it('keeps the second try only when it left the target alone', () => {
    expect(src).toMatch(/!movedTheirTargetToWhereTheyAre\(second\.text, standsAt, target\)/);
  });

  it('and reads where they stand only from a turn that says where they stand', () => {
    expect(src).toMatch(/saysWhereItStands\(message \?\? ''\) \? theNumbersIn\(message \?\? ''\) : \[\]/);
  });
});
