import { runIntake } from './intake';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ONE CHECKABLE TURN IS NOT "NOTHING CHECKABLE".
 *
 * A rice miller answered "Forty tonnes a week.", "October." and "Maybe six of them." between six
 * "fine"s and "no"s, and the board stamped him "nothing checkable" (adversarial run, 20 Sep 2026).
 * The specificity level was a mean over every turn, and a reluctant person's one fact per turn
 * drowned in their acknowledgements. Whether any turn was checkable is now its own fact, the board
 * asks that fact, and the level is read over the turns that said anything.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('a single turn', () => {
  it('is checkable when it carries a number, a date or a verifiable claim, however short', () => {
    expect(runIntake('Forty tonnes a week.').checkable).toBe(true);
    expect(runIntake('October.').checkable).toBe(true);
    expect(runIntake('Around 260.').checkable).toBe(true);
    expect(runIntake('Fine.').checkable).toBe(false);
    expect(runIntake('No, not really.').checkable).toBe(false);
  });
});

describe('the session level and the board', () => {
  /* The read moved out of conversation.service.ts into the-specificity-read.ts, so a stored session is
     brought up to date by the same rule (request 103). The same lines are pinned there. */
  const service = strip(readFileSync(join(__dirname, 'the-specificity-read.ts'), 'utf8'));
  const board = strip(readFileSync(join(__dirname, '..', 'board', 'board.service.ts'), 'utf8'));
  it('read the level over substantive turns and keep whether any turn was checkable', () => {
    expect(service).toContain("const substantive = all.filter((r, i) => r.checkable || (turns[i] ?? '').trim().split(/\\s+/).length > 3);");
    expect(service).toContain("checkable: anyCheckable ? 'specific' : NOTHING_SAID,");
    expect(service).toMatch(/level: anyCheckable && mapSpecificityLevel\(avgSpecificity\) === NOTHING_SAID \? 'vague'/);
  });
  it('and the board asks whether any turn was checkable before it asks the level', () => {
    /* 27 Sep 2026 (a1747927) the board stopped reading this and asked the record instead. 28 Sep 2026,
       Hafsah: the rating of how checkable the answers are is needed, and the prototype shows
       "Nothing checkable" on the lead's board. So the board reads it again, `checkable` first, as it
       did before, and the record answers only for a check-in not read yet. */
    expect(board).toContain("if ((c?.specificityDimensions as any)?.checkable === 'specific') return true;");
    expect(board).toContain("if (c?.specificityLevel) return !['vague', 'managed'].includes(String(c.specificityLevel).toLowerCase());");
    expect(board).toContain('return recordHasSomething;');
  });
});
