import { readFileSync } from 'fs';
import { join } from 'path';

/* Comments are taken out before anything is matched, so a sentence in a comment cannot satisfy this. */
const withoutComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * "Managing only" is an internal flag. The board's participant rows and the check-in grid served it as the lead's
 * role, so a reader saw it printed under her name. A role is the lead's own words or nothing.
 */
describe('the board does not serve a flag as a role', () => {
  it('has no "Managing only" text anywhere in what it serves as a role', () => {
    const src = withoutComments(readFileSync(join(__dirname, 'board.service.ts'), 'utf8'));
    expect(src).not.toMatch(/['"]Managing only['"]/);
  });
});
