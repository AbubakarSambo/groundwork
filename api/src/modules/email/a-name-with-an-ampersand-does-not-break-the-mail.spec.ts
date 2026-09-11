import { readFileSync } from 'fs';
import { join } from 'path';
import { escapeHtml } from './email.service';

/**
 * A NAME WITH AN AMPERSAND DOES NOT BREAK THE MAIL. Ground labels, names, notes and reasons somebody
 * typed were interpolated raw into HTML. A team whose project is "Q3 <finance & ops>" got half a
 * sentence. Every interpolation of a user-supplied value in an HTML body is escaped, once.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'email.service.ts'), 'utf8'));

describe('the values somebody typed', () => {
  it.each(['groundLabel', 'founderName', 'adminName', 'note', 'reason', 'participantEmail', 'who', 'addedBy', 'checkInLabel', 'orgName', 'endStateLabel'])(
    '%s never reaches an HTML body raw',
    (name) => {
      /* Inside an html: template literal, the bare `${name}` must not appear; `${escapeHtml(name)}` may. */
      const bodies = [...service.matchAll(/html: this\.layout\(([\s\S]*?)\),\s*\}/g)].map((m) => m[1]);
      expect(bodies.length).toBeGreaterThan(20);
      for (const b of bodies) expect(b).not.toContain('${' + name + '}');
    },
  );

  it('and is escaped once, never twice', () => {
    expect(escapeHtml('Q3 <finance & ops>')).toBe('Q3 &lt;finance &amp; ops&gt;');
    expect(service).not.toMatch(/escapeHtml\(escapeHtml\(/);
  });
});

describe('dates and money', () => {
  it('a date is printed in ISO order and money names its currency', () => {
    expect(service).not.toMatch(/toLocaleDateString\('en-US'/);
    expect(service).toMatch(/return `\$\{\(cents \/ 100\)\.toFixed\(2\)\} USD`;/);
    expect(service).not.toMatch(/\$\$\{amount\}/);
  });
});

describe('the word', () => {
  it('"account" is only ever somebody\'s account of the work, never a login', () => {
    /* "Add my account", "their account is on record": the product's own sense, a person's account of the work. */
    const logins = service.split('\n').filter((l) => /\baccount\b/i.test(l) && !/account of|accounts agree|their account|own account|your account and|an account of|my account|account is on record|corrected their account/i.test(l) && !/^\s*\*/.test(l));
    expect(logins).toEqual([]);
  });
});
