import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * SIGNING IN AND BEING ASKED TO SET UP THE ORGANISATION YOU ALREADY HAVE.
 *
 * The client's gate is `isOrgSetupComplete = !!organization.email`, and three of the five paths that
 * create an organisation set only a name and a slug. So a person who signed up with Google - or with
 * a password, or through the entry flow - was sent to "Set up your organization" on EVERY sign-in,
 * forever, and asked for a name the organisation already had.
 *
 * Reproduced by signing in on a local account whose organisation had no contact email: straight to
 * /org/setup, exactly as reported.
 *
 * DEFAULTING IT IS NOT A GUESS. The person creating an organisation is its first admin, their
 * address is the one we already write to, and Settings changes it in one field. Asking again for
 * something already known is the defect.
 *
 * Comments stripped: this explanation names the field it protects.
 */
const SRC = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

/**
 * Every `organization.create` in the file, with the data it passes.
 *
 * Taken up to the closing `})` rather than to the first `}`: one of these names an organisation
 * with a template literal, `${firstName}'s workspace`, whose brace ended the match early and made
 * that call look as though it passed almost nothing.
 */
function creations(): string[] {
  return [...SRC.matchAll(/organization\.create\(([\s\S]*?)\}\s*\)/g)].map((m) => m[1]);
}

describe('an organisation is set up at the moment it is created', () => {
  it('finds every creation, so an empty list cannot pass', () => {
    expect(creations().length).toBeGreaterThanOrEqual(5);
  });

  it('every one of them sets a contact email', () => {
    /* The one field the client gates on. Without it the admin is asked to set up, forever. */
    const missing = creations().filter((d) => !/email/.test(d));
    expect(missing).toEqual([]);
  });

  it('and a name and a slug, which is what it always did', () => {
    for (const d of creations()) {
      expect(d).toMatch(/name:/);
      expect(d).toMatch(/slug/);
    }
  });
});
