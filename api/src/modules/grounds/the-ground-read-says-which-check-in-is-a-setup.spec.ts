import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE GROUND READ SAYS WHICH CHECK-IN IS A SET-UP CONVERSATION (final check of the anchor, 8 October).
 * The anchor lead has a set-up conversation, saved as a finished session 1, and she does not check in. Every count of sessions leaves a set-up
 * row out with `!c.isSetup`, on the server and on the screens, but the ground read never selected the field, so the filter let it through and
 * the lead read "1 of 4 sessions are done." on the first day.
 */
describe('the ground read serves isSetup on every check-in row', () => {
  const service = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8');
  it('selects it in both reads that serve the rows', () => {
    const selects = [...service.matchAll(/const CHECKIN_SELECT = \{([^}]*)\}/g)].map((m) => m[1]);
    expect(selects.length).toBeGreaterThan(0);
    for (const s of selects) expect(s).toContain('isSetup: true');
  });
});

