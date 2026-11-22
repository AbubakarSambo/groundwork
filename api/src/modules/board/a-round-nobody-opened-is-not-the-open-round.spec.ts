import { readFileSync } from 'fs';
import { join } from 'path';
import { whichRoundIsOpen } from './which-round-is-open';

/**
 * A ROUND NOBODY HAS OPENED IS NOT THE ROUND THE BOARD IS ABOUT.
 *
 * Next round's check-in rows are written ahead of time, all NOT_STARTED. The board took the open
 * round to be the lowest session anybody had not finished, which is that untouched round the moment
 * the real one closes. Every tile then counted a session with nothing in it.
 *
 * Read live on a forty-person convening: all forty had answered, thirty-six hard blockers were on
 * the record, and the board said "Blockers: None, nobody named anything holding work up". The
 * written report, counting the round people had actually answered, said thirty-six on the same day.
 *
 * The rule, not the line: whatever the board calls the open round, a session no one has touched
 * cannot be it while an earlier session has been.
 */
describe('the open round is one somebody has touched', () => {
  const row = (sessionNumber: number, status: string) => ({ sessionNumber, status });

  it('is not next week\'s row, written ahead of time and untouched', () => {
    const forty = Array.from({ length: 40 }, (_, i) => i);
    const rows = [
      ...forty.map(() => row(1, 'COMPLETED')),
      ...forty.map(() => row(2, 'NOT_STARTED')),
    ];
    expect(whichRoundIsOpen(rows)).toBe(1);
  });

  it('stays on a started round while one person in it has still not answered', () => {
    expect(whichRoundIsOpen([row(1, 'COMPLETED'), row(1, 'NOT_STARTED'), row(2, 'NOT_STARTED')])).toBe(1);
  });

  /* Changed 22 November 2026 (Hafsah: "Yes, move it on"): a session is over once the next has begun, so somebody still in session 1
     no longer holds the team there. Before, this test read "goes back ... until they answer it". */
  it('is the latest round somebody has begun, even while somebody has not finished an earlier one', () => {
    const rows = [
      row(1, 'COMPLETED'), row(1, 'COMPLETED'), row(1, 'IN_PROGRESS'),
      row(2, 'IN_PROGRESS'), row(2, 'IN_PROGRESS'),
    ];
    expect(whichRoundIsOpen(rows)).toBe(2);
  });

  it('and a round whose day to open has come has begun, though nobody has touched it yet', () => {
    const now = new Date('2026-11-22T09:00:00Z');
    const rows = [{ ...row(1, 'COMPLETED') }, { ...row(2, 'NOT_STARTED'), availableFrom: new Date('2026-11-22T08:00:00Z') }, { ...row(3, 'NOT_STARTED'), availableFrom: new Date('2026-11-29T08:00:00Z') }];
    expect(whichRoundIsOpen(rows, now)).toBe(2);
  });

  it('moves on once every started round is met', () => {
    expect(whichRoundIsOpen([row(1, 'COMPLETED'), row(2, 'DECLINED'), row(3, 'NOT_STARTED')])).toBe(2);
  });

  it('the board asks that one function rather than keeping a second copy of the rule', () => {
    const src = readFileSync(join(__dirname, 'board.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const assign of src.match(/const openRound =[^\n]*/g) ?? []) {
      /* Or theTeamsOpenRound, which reads the team's rows and then asks whichRoundIsOpen itself (6e16c3df3). */
      expect(assign).toMatch(/whichRoundIsOpen|theTeamsOpenRound/);
    }
  });
});
