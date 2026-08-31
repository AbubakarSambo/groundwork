import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A SURFACE CANNOT APPLY A RULE IT IS NOT GIVEN THE DATA FOR.
 *
 * `railAttention` in the client decides what a check-in wants from a person, and its rule is
 * explicit: a round scheduled for next fortnight is not something anybody is late for. It reads
 * `availableFrom`.
 *
 * `list()` did not select that field. `get()` always has. So the same check-in said "your turn" in
 * the rail, which is fed by the list, and said nothing on its own page, which is fed by the detail -
 * two surfaces, one rule, different data. It went unnoticed while the rail's marker was a coloured
 * dot; it became visible the moment the dashboard cards started saying it in words.
 *
 * Asserted on the selects rather than on a response, because the failure is a field quietly missing
 * from one of two queries, which is exactly what a response test with a fixture would not catch.
 *
 * Comments stripped: this file names the field it protects.
 */
const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

/** Every checkIns select in the file, whichever query it belongs to. */
const checkInSelects = () => {
  const out: string[] = [];
  for (const m of SRC.matchAll(/select:\s*\{[^}]*participantId:\s*true[^}]*sessionNumber:\s*true[^}]*\}/g)) {
    out.push(m[0]);
  }
  return out;
};

describe('the list carries what the rail reads', () => {
  it('finds the selects, so an empty sweep cannot pass', () => {
    expect(checkInSelects().length).toBeGreaterThanOrEqual(2);
  });

  it('every check-in select carries availableFrom', () => {
    const missing = checkInSelects().filter(s => !/availableFrom:\s*true/.test(s));
    expect(missing).toEqual([]);
  });

  it('including the shared CHECKIN_SELECT the detail queries use', () => {
    const i = SRC.indexOf('const CHECKIN_SELECT');
    expect(i).toBeGreaterThan(-1);
    expect(SRC.slice(i, i + 300)).toMatch(/availableFrom:\s*true/);
  });
});
