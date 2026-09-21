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
  const service = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));
  const board = strip(readFileSync(join(__dirname, '..', 'board', 'board.service.ts'), 'utf8'));
  it('read the level over substantive turns and keep whether any turn was checkable', () => {
    expect(service).toContain("const substantive = all.filter((r, i) => r.checkable || (personTurns[i].content ?? '').trim().split(/\\s+/).length > 3);");
    expect(service).toContain("checkable:  anyCheckable ? 'specific' : NOTHING_SAID,");
    expect(service).toMatch(/level: anyCheckable && mapSpecificityLevel\(avgSpecificity\) === NOTHING_SAID \? 'vague'/);
  });
  it('and the board asks that fact before falling back to the level', () => {
    expect(board).toContain("saidAnythingCheckable: ((thisRound as any)?.specificityDimensions as any)?.checkable === 'specific'");
    expect(board).toMatch(/completedAt: true, specificityLevel: true, specificityDimensions: true,/);
  });
});
