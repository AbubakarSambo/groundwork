import { readFileSync } from 'fs';
import { join } from 'path';
import { aNameOutOfAnAddress } from './a-name-out-of-an-address';

/**
 * "IF YOUR EMAIL IS ANNA@GMAIL.COM, YOU CAN USE ANNA+AMARA@GMAIL.COM TO TEST."
 *
 * That is how anybody tests a product whose whole point is several people answering separately: one
 * real inbox, addressed as many times as there are participants. It is also ordinary mail routing
 * that people use at work, so it is not only a testing concern.
 *
 * Sign-up already handled it - `auth.service` turns `. _ - +` into spaces and takes the first word,
 * so `anna+amara@gmail.com` is Anna. The invite path did not: it capitalised the whole local part,
 * so somebody added by that address was "Anna+chidi" on the roster, in the report, and in every
 * sentence the check-in wrote about them. Twenty invitations in an afternoon is twenty of those.
 *
 * ONE RULE IN ONE PLACE, because two doors deriving a name by different rules is how the same person
 * gets two names depending on how they arrived.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const GROUNDS = strip(readFileSync(join(__dirname, '..', 'grounds', 'grounds.service.ts'), 'utf8'));
const PUBLIC_API = strip(
  readFileSync(join(__dirname, '..', 'public-api', 'a-check-in-a-customer-can-run.service.ts'), 'utf8'),
);

describe('a name out of an address', () => {
  it('stops at the plus, which is the whole point', () => {
    expect(aNameOutOfAnAddress('anna+amara@gmail.com')).toBe('Anna');
    expect(aNameOutOfAnAddress('anna+chidi@gmail.com')).toBe('Anna');
  });

  it('and reads the ordinary separators the same way sign-up does', () => {
    expect(aNameOutOfAnAddress('jane.okafor@company.com')).toBe('Jane');
    expect(aNameOutOfAnAddress('t_bakare@company.com')).toBe('T');
    expect(aNameOutOfAnAddress('mary-anne@company.com')).toBe('Mary');
  });

  it('leaves a plain address exactly as it was', () => {
    expect(aNameOutOfAnAddress('adaeze@company.com')).toBe('Adaeze');
  });

  it('never returns nothing', () => {
    /* A person with no name is worse than a wrong one: every sentence about them loses its subject. */
    expect(aNameOutOfAnAddress('@company.com')).toBe('there');
    expect(aNameOutOfAnAddress('+++@company.com')).toBe('there');
  });

  it('and both doors that invent a name from an address use it', () => {
    expect(GROUNDS).toContain('aNameOutOfAnAddress(email)');
    expect(GROUNDS).not.toContain("local.charAt(0).toUpperCase() + local.slice(1)");
    expect(PUBLIC_API).toContain('aNameOutOfAnAddress(email)');
    expect(PUBLIC_API).not.toContain("email.split('@')[0]");
  });
});
