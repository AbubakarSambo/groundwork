import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * NO READ INVENTS ITS OWN ANSWER. The scan that stops the fourteen local formulas coming back: a
 * grounds, reports or board read that compares role and organisation itself, instead of asking
 * who-may-read-this-check-in.ts, fails here. Comments are stripped first, so a sentence quoting the
 * old formula cannot satisfy or fail it.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const FILES = ['../grounds/grounds.service.ts', '../reports/reports.service.ts', '../board/board.service.ts'];

describe.each(FILES)('%s', (rel) => {
  const src = strip(readFileSync(join(__dirname, rel), 'utf8'));

  it('asks the one rule', () => {
    expect(src).toMatch(/from '(\.\.\/grounds\/|\.\/)who-may-read-this-check-in'/);
  });

  it('never decides "admin of this organisation" for itself', () => {
    const lines = src.split('\n').filter((l) => /role\s*===\s*'ADMIN'/.test(l) && /organizationId\s*===/.test(l));
    expect(lines).toEqual([]);
    expect(src).not.toMatch(/const isAdmin = userRole === 'ADMIN'/);
  });
});
