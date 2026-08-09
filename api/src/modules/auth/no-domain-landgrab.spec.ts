import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * AN UNVERIFIED STRANGER CANNOT CLAIM A COMPANY'S NAMESPACE.
 *
 * GW-001 from the eighteen-ground run. Signing up as `sahar@meridianhealth.test`
 * produced, before the activation link was opened:
 *
 *   organizations:  Sahar's workspace  |  meridianhealth
 *   users:          sahar@...          |  ADMIN  |  is_email_verified = f
 *
 * The slug came from the EMAIL DOMAIN. So whoever typed a given company's domain
 * first took that company's slug platform-wide, and `generateUniqueSlug` then
 * pushed the real organisation to `meridianhealth-2` when they eventually arrived.
 * It required no access to the mailbox, because none of this waits for
 * verification.
 *
 * The other signup path had the same defect one step further on: with no org name
 * supplied it named the organisation itself after the domain, so the org was
 * literally called "Meridianhealth".
 *
 * Both now fall back to the person's own name, which is scoped to their account
 * rather than to their employer. Nothing shared can be claimed by someone who has
 * not proved they own the address.
 *
 * SINCE CLOSED IN FULL. When this file was written, the land-grab was fixed but a
 * User with role ADMIN and an Organization were still created before verification.
 * That half is now done too, via the `pendingSignup` record - see
 * `nothing-before-verification.spec.ts`.
 */

const SRC = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8');

/**
 * NOTE ON SCOPE, after the full GW-001 fix.
 *
 * This file originally checked the slug logic inside `entrySave`. That logic no
 * longer lives there: `entrySave` now creates nothing at all for a new address,
 * and the organisation - with its slug - is built in `verifyEmail` when the link
 * is opened. Those assertions moved to `nothing-before-verification.spec.ts`,
 * which owns the "nothing exists until it is proved" property end to end.
 *
 * What remains here is the OTHER signup path, `registerMagicLink`, which had the
 * same defect one step further on: with no organisation name supplied it named
 * the organisation after the email domain, so `sahar@meridianhealth.test` created
 * an org literally called "Meridianhealth" and took that slug.
 */

describe('the entry-flow signup no longer slugs anything itself', () => {
  const ENTRY_SAVE = (() => {
    const i = SRC.indexOf('async entrySave');
    expect(i).toBeGreaterThan(-1);
    return SRC.slice(i, SRC.indexOf('// Existing user saving a (new) anonymous session', i));
  })();

  it('computes no slug on the unverified path', () => {
    // There is nothing to slug: no organisation is created here any more.
    expect(ENTRY_SAVE).not.toMatch(/generateUniqueSlug/);
  });

  it('never reads the email domain for naming', () => {
    // THE ORIGINAL DEFECT. `domainBase` was the email's domain.
    expect(ENTRY_SAVE).not.toMatch(/domainBase/);
  });
});

describe('the magic-link signup (registerMagicLink)', () => {
  const REGISTER = (() => {
    const i = SRC.indexOf('async registerMagicLink');
    expect(i).toBeGreaterThan(-1);
    return SRC.slice(i, SRC.indexOf('async login', i));
  })();

  it('falls back to the person, not their employer, when no org name is given', () => {
    expect(REGISTER).toMatch(/const organizationName = dto\.organizationName\?\.trim\(\) \|\| `\$\{firstName\}'s workspace`/);
  });

  it('no longer names the organisation after the email domain', () => {
    expect(REGISTER).not.toMatch(/organizationName = dto\.organizationName\?\.trim\(\) \|\| emailDomain/);
  });

  it('still honours an organisation name the caller supplied', () => {
    expect(REGISTER).toMatch(/dto\.organizationName\?\.trim\(\)/);
  });
});
