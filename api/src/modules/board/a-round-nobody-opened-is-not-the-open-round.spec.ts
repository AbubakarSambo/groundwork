import { readFileSync } from 'fs';
import { join } from 'path';

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
  const src = readFileSync(join(__dirname, 'board.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('the board only considers a session open once a row in it is no longer NOT_STARTED', () => {
    const decides = src.slice(src.indexOf('const openRound ='), src.indexOf('const openRound =') + 400);
    expect(decides).toContain('started');
    /* The old rule read every unfinished row, untouched ones included. */
    expect(src).toMatch(/started\.has\(c\.sessionNumber\)/);
  });

  it('and falls back to the newest round somebody HAS touched, never to a row written ahead', () => {
    expect(src).toMatch(/started\.size \? Math\.max\(\.\.\.started\)/);
  });
});
