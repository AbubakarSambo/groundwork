import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * NOTHING IS PROVISIONED UNTIL THE EMAIL ADDRESS IS PROVED.
 *
 * GW-001, the highest-severity finding of the eighteen-ground run, and the one
 * that was still half-open after the first pass.
 *
 * What used to happen: submitting an email on the entry flow's save panel created
 * an Organization and a User with role ADMIN, on the spot, with
 * `isEmailVerified: false`. Read straight from the run's database seconds after
 * pressing the button, before the activation link had been touched:
 *
 *   users:          sahar@meridianhealth.test | ADMIN | is_email_verified = f
 *   organizations:  Sahar's workspace         | meridianhealth
 *
 * Three things wrong at once, and the third is the sharp one:
 *
 *   1. an ADMIN account existed on an address nobody had proved
 *   2. the organisation was named from the email, never asked
 *   3. the SLUG was taken from the email DOMAIN, so whoever typed a company's
 *      domain first claimed that company's namespace platform-wide
 *
 * Typing a stranger's work address provisioned an organisation and an admin
 * account in their name. They would learn about it only if they read the mail.
 *
 * The signup now waits in `pendingSignup` - address, name, org name, and the whole
 * anonymous transcript - keyed to the verification token. The Organization, the
 * User and the EntryDraft are created in one transaction inside `verifyEmail`,
 * which only runs because the link was opened.
 *
 * These assertions are on source rather than behaviour because the failure mode is
 * a future edit reintroducing a create() on the unverified path, and that edit
 * will look perfectly reasonable in isolation.
 */

const AUTH = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8');
const ENTRY = readFileSync(join(__dirname, '..', 'entry', 'entry.service.ts'), 'utf8');
const SCHEMA = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8');

/** The new-address branch of entrySave - the one that used to provision. */
const NEW_ADDRESS_BRANCH = (() => {
  const i = AUTH.indexOf('async entrySave');
  expect(i).toBeGreaterThan(-1);
  const j = AUTH.indexOf('// Existing user saving a (new) anonymous session', i);
  expect(j).toBeGreaterThan(-1);
  return AUTH.slice(i, j);
})();

describe('the unverified path creates nothing real', () => {
  it('creates no organisation', () => {
    expect(NEW_ADDRESS_BRANCH).not.toMatch(/organization\.create/);
    expect(NEW_ADDRESS_BRANCH).not.toMatch(/tx\.organization/);
  });

  it('creates no user, and certainly no ADMIN', () => {
    expect(NEW_ADDRESS_BRANCH).not.toMatch(/user\.create/);
    expect(NEW_ADDRESS_BRANCH).not.toMatch(/role: 'ADMIN'/);
  });

  it('creates no entry draft, because there is no user to hang it on', () => {
    expect(NEW_ADDRESS_BRANCH).not.toMatch(/entryDraft\.create/);
  });

  it('parks the whole signup instead, keyed to the verification token', () => {
    expect(NEW_ADDRESS_BRANCH).toMatch(/pendingSignup\.upsert/);
    // The transcript travels with it, so the link works from any browser.
    expect(NEW_ADDRESS_BRANCH).toMatch(/payload: \(draft\?\.payload \?\? \{\}\) as any/);
    expect(NEW_ADDRESS_BRANCH).toMatch(/history: \(draft\?\.history \?\? \[\]\) as any/);
  });

  it('upserts on email, so pressing save twice does not stack or fail', () => {
    expect(NEW_ADDRESS_BRANCH).toMatch(/where: \{ email: lower \}/);
  });

  it('still sends the link', () => {
    expect(NEW_ADDRESS_BRANCH).toMatch(/sendMagicLinkEmail\(lower, firstName, token\)/);
  });
});

describe('verification is what provisions', () => {
  const VERIFY = (() => {
    const i = AUTH.indexOf('async verifyEmail');
    return AUTH.slice(i, AUTH.indexOf('async setPassword', i));
  })();

  it('looks for a pending signup before anything else', () => {
    // There is no EmailVerificationToken row for a pending signup, so this must
    // come before consumeToken or every new signup fails at the link.
    const pendingAt = VERIFY.indexOf('pendingSignup.findUnique');
    // The actual call, not the word - my own comment above it mentions
    // consumeToken and an looser search matched the comment instead.
    const consumeAt = VERIFY.indexOf('await this.consumeToken(');
    expect(pendingAt).toBeGreaterThan(-1);
    expect(pendingAt).toBeLessThan(consumeAt);
  });

  it('creates the organisation and the user here, in one transaction', () => {
    expect(VERIFY).toMatch(/\$transaction/);
    expect(VERIFY).toMatch(/tx\.organization\.create/);
    expect(VERIFY).toMatch(/tx\.user\.create/);
  });

  it('marks the account verified, because the link is the proof', () => {
    expect(VERIFY).toMatch(/isEmailVerified: true/);
  });

  it('slugs from the organisation name, never the email domain', () => {
    expect(VERIFY).toMatch(/generateUniqueSlug\(orgName\)/);
    expect(VERIFY).not.toMatch(/generateUniqueSlug\([^)]*domain/i);
  });

  it('carries the parked transcript into the real draft', () => {
    expect(VERIFY).toMatch(/tx\.entryDraft\.create/);
    expect(VERIFY).toMatch(/payload: \(pending\.payload \?\? \{\}\) as any/);
  });

  it('clears the pending record so a link cannot be replayed', () => {
    expect(VERIFY).toMatch(/tx\.pendingSignup\.delete/);
  });

  it('refuses an expired link and does not leave the pending row behind', () => {
    expect(VERIFY).toMatch(/pending\.expiresAt < new Date\(\)/);
    expect(VERIFY).toMatch(/pendingSignup\.delete/);
  });

  it('handles the address having signed up by another route meanwhile', () => {
    expect(VERIFY).toMatch(/const already = await this\.prisma\.user\.findUnique/);
  });
});

describe('post-email edits still reach a signup that has no user yet', () => {
  it('patchDraft checks the pending signup before the entry draft', () => {
    // The org name arrives this way after the email is given. Without this it
    // 404s for the entire window between saving and opening the link.
    const i = ENTRY.indexOf('async patchDraft');
    const block = ENTRY.slice(i, ENTRY.indexOf('joinPreview', i));
    const pendingAt = block.indexOf('pendingSignup.findUnique');
    const draftAt = block.indexOf('entryDraft.findUnique');
    expect(pendingAt).toBeGreaterThan(-1);
    expect(pendingAt).toBeLessThan(draftAt);
    expect(block).toMatch(/orgName: typedOrgName/);
  });
});

describe('the pending signup is not a member of anything', () => {
  const MODEL = (() => {
    const i = SCHEMA.indexOf('model PendingSignup {');
    expect(i).toBeGreaterThan(-1);
    return SCHEMA.slice(i, SCHEMA.indexOf('\n}', i));
  })();

  it('has no relation to an organisation or a user', () => {
    // A pending signup belongs to nothing - that is the entire point.
    expect(MODEL).not.toMatch(/@relation/);
    expect(MODEL).not.toMatch(/organizationId/);
    expect(MODEL).not.toMatch(/userId/);
  });

  it('expires', () => {
    expect(MODEL).toMatch(/expiresAt\s+DateTime/);
  });

  it('is unique per address and per token', () => {
    expect(MODEL).toMatch(/email\s+String\s+@unique/);
    expect(MODEL).toMatch(/token\s+String\s+@unique/);
  });
});
