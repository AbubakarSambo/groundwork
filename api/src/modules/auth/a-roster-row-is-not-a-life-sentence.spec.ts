import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { whatTheirWorkspaceIsCalled } from './a-roster-row-is-not-a-life-sentence';

/**
 * "SOMEONE IS MY ACCOUNT AND CREATED THEIR OWN ACCOUNT AND KEEP SHOWING UP TO MY ACCOUNT. AND THEY
 * CANNOT SWITCH TO THEIR."
 *
 * Hafsah, 23 September 2026. The cause is a deliberate rule working as designed in a case nobody
 * had considered: an address on somebody's roster is joined to THAT organisation at verification -
 * right for an employee whose HR directory listed them, wrong for a respondent or a contact who
 * signed up to use Groundwork for their own work. One membership, so no switcher and no way out.
 */
describe('what their own workspace is called', () => {
  it('is named after them', () => {
    expect(whatTheirWorkspaceIsCalled('Maureen', 'Unogu')).toBe("Maureen's workspace");
  });

  it('and never after nothing', () => {
    expect(whatTheirWorkspaceIsCalled(null, null)).toBe('My workspace');
    expect(whatTheirWorkspaceIsCalled('', '')).toBe('My workspace');
  });

  /* The domain is deliberately not used: naming an organisation after @coamana.com is the
     land-grab already fixed on `register`. */
  it('and never after the email domain', () => {
    expect(whatTheirWorkspaceIsCalled('Maureen', 'Unogu')).not.toMatch(/coamana|\.com/);
  });
});

/* "AND ONLY ONE OF THEM" IS GONE (U.3). Hafsah decided on 26 September that a person can create more
   than one organisation, each with its own plan, as the prototype's "Create an organisation" allows.
   creating-an-organisation.spec.ts checks a second one is now made. */

describe('what the door does and does not do', () => {
  const SRC = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const fn = SRC.slice(SRC.indexOf('async startMyOwnWorkspace('), SRC.indexOf('private async generateUniqueSlug('));

  /* THE RULE ITSELF IS NOT TOUCHED. Nobody is removed from an organisation and no stranger is put
     into one; the fix is a door, not a reversal. See the module's own note for why. */
  it('takes nobody out of the organisation they were listed in', () => {
    expect(fn).not.toMatch(/\bdelete\b|\bdisconnect\b/);
    expect(fn).toMatch(/organizationMembership\.upsert/);
  });

  it('and makes them the admin of the one they founded', () => {
    expect(fn).toMatch(/organizationMembership\.create\(\{\s*data: \{ userId, organizationId: created\.id, role: 'ADMIN'/);
  });

  /*
   * AND WRITES THE MEMBERSHIP OF WHERE THEY ALREADY WERE.
   *
   * A user joined to a roster organisation has `user.organizationId` set and often no membership
   * row at all - `myOrganizations` papers over exactly that with a self-healing branch. Without
   * this, switching into the new workspace would leave them unable to switch back: the same trap,
   * facing the other way.
   */
  it('so they can switch back', () => {
    expect(fn).toMatch(/organizationId: user\.organizationId/);
    expect(fn).toMatch(/role: 'MEMBER'/);
  });

  it('and the slug comes from the name, never the address', () => {
    expect(fn).toMatch(/generateUniqueSlug\(name\)/);
    expect(fn).not.toMatch(/split\('@'\)/);
  });

  it('and it ends in the switch, so they are where they asked to be', () => {
    expect(fn).toMatch(/return this\.switchOrganization\(userId, org\.id\)/);
  });
});
