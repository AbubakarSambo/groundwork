import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "NOTHING IS EVER EXPOSED BEYOND THIS MAC" (Hafsah). In development `app.listen(port, '0.0.0.0')`
 * bound every network address this machine has, not only itself - so a server running on a laptop
 * for development answered anyone on the same network. Development now binds '127.0.0.1', this
 * machine alone; production is unchanged, since a deployed server is meant to be reached from
 * outside the box it runs on.
 *
 * Comments are stripped first: a guard a comment satisfies is not a guard.
 */
describe('the API only listens on this machine in development', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const main = strip(readFileSync(join(__dirname, 'main.ts'), 'utf8'));

  it('binds 127.0.0.1 whenever NODE_ENV is not production', () => {
    expect(main).toMatch(/const host = \(process\.env\.NODE_ENV \|\| 'development'\) === 'production' \? '0\.0\.0\.0' : '127\.0\.0\.1';/);
  });

  it('production still binds every address, unchanged', () => {
    expect(main).toMatch(/=== 'production' \? '0\.0\.0\.0'/);
  });

  it('the computed host, not a literal, is what app.listen is given', () => {
    expect(main).toMatch(/await app\.listen\(port, host\);/);
    expect(main).not.toMatch(/app\.listen\(port, '0\.0\.0\.0'\)/);
  });
});
