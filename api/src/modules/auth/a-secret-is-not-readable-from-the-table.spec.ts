import { readFileSync } from 'fs';
import { join } from 'path';
import { hashed } from './a-token-is-stored-as-its-hash';

/**
 * A SECRET IS NOT READABLE FROM THE TABLE.
 *
 * Every set-password, reset and magic-link token was stored in plaintext, so a read of
 * email_verification_tokens was a set of working links into other people's accounts. The row holds
 * the hash; the email holds the token; lookups hash first (fix plan A10). validateToken, which
 * disclosed the address behind an unused link, now says valid and nothing else.
 */
const MODULES = join(__dirname, '..');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (rel: string) => strip(readFileSync(join(MODULES, rel), 'utf8'));
const WRITERS = ['auth/auth.service.ts', 'users/users.service.ts', 'participants/participants.service.ts', 'grounds/grounds.service.ts', 'entry/entry.service.ts'];

describe('an emailed token', () => {
  it('hashes the same way every time and never to itself', () => {
    expect(hashed('abc')).toBe(hashed('abc'));
    expect(hashed('abc')).toHaveLength(64);
    expect(hashed('abc')).not.toBe('abc');
  });

  it('is written to the table as its hash, at every writer', () => {
    const plain: string[] = [];
    let seen = 0;
    for (const rel of WRITERS) {
      const code = read(rel);
      let i = 0;
      for (;;) {
        const j = code.indexOf('emailVerificationToken.create(', i);
        if (j < 0) break;
        seen += 1;
        const seg = code.slice(j, code.indexOf('})', j));
        if (!/token: hashed\(/.test(seg)) plain.push(`${rel}: ${seg.slice(0, 80).replace(/\s+/g, ' ')}`);
        i = j + 1;
      }
    }
    expect(seen).toBeGreaterThanOrEqual(15);
    expect(plain).toEqual([]);
  });

  it('is looked up by its hash, never by the token itself', () => {
    const auth = read('auth/auth.service.ts');
    const lookups = [...auth.matchAll(/emailVerificationToken\.findUnique\(\{[\s\S]{0,120}?where:\s*\{\s*token[^}]*\}/g)].map((m) => m[0]);
    expect(lookups.length).toBeGreaterThanOrEqual(2);
    for (const l of lookups) expect(l).toContain('token: hashed(token)');
  });

  it('and validateToken tells nobody whose link it is', () => {
    const auth = read('auth/auth.service.ts');
    const body = auth.slice(auth.indexOf('async validateToken('), auth.indexOf('async validateToken(') + 900);
    expect(body).toContain('return { valid: true };');
    expect(body).not.toMatch(/email: tokenRecord/);
    expect(body).not.toMatch(/firstName: tokenRecord/);
  });
});
