import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "Managing only" is an internal flag. The board's participant rows and the check-in grid served it as the lead's
 * role, so a reader saw it printed under her name. A role is the lead's own words or nothing.
 */
describe('the board does not serve a flag as a role', () => {
  it('has no "Managing only" text anywhere in what it serves as a role', () => {
    const src = readFileSync(join(__dirname, 'board.service.ts'), 'utf8');
    expect(src).not.toMatch(/['"]Managing only['"]/);
  });
});
