import { readFileSync } from 'fs';
import { join } from 'path';
import { theAddressTheApiListensOn } from './the-address-the-api-listens-on';

/**
 * "NOTHING IS EVER EXPOSED BEYOND THIS MAC" (Hafsah, 28 September 2026). Only an explicit
 * development run is narrowed to this machine. In every other case the API listens exactly as it
 * did before this work, on every address, so no deployed server can become unreachable.
 *
 * Comments are stripped before the source is read: a guard a comment satisfies is not a guard.
 */
describe('where the API listens', () => {
  it('a development run listens on this machine only', () => {
    expect(theAddressTheApiListensOn('development')).toBe('127.0.0.1');
  });

  it('every other value, and no value at all, listens as before, on every address', () => {
    for (const value of [undefined, '', 'production', 'test', 'preview', 'Development', 'dev', 'anything else']) {
      expect(theAddressTheApiListensOn(value)).toBe('0.0.0.0');
    }
  });

  it('the start-up gives the listen call this rule, not a literal address', () => {
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const main = strip(readFileSync(join(__dirname, 'main.ts'), 'utf8'));
    expect(main).toMatch(/const host = theAddressTheApiListensOn\(process\.env\.NODE_ENV\);/);
    expect(main).toMatch(/await app\.listen\(port, host\);/);
    expect(main).not.toMatch(/app\.listen\(port, '(0\.0\.0\.0|127\.0\.0\.1)'\)/);
  });
});
