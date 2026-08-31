import { isASecondOrganisation, GUEST_ROLE } from './joining-a-second-organisation';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * SOMEBODY IN TWO COMPANIES HAD ONE MEMBERSHIP.
 *
 * The middleware that writes a membership fires on `User.create`, so it records the organisation an
 * account was made in and never any other. Being added to a ground somewhere else reused the
 * account, linked the participant row, and wrote nothing - which is why the org switcher could not
 * list the second place, and why an admin of their own company read as an admin everywhere they
 * were a guest.
 *
 * The server refused them throughout - every org-scoped read checks the organisation - so nothing
 * was disclosed. They were shown doors that would not open, which is the same defect as the
 * check-in button, one level up.
 */
const SRC = readFileSync(join(__dirname, 'participants.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

describe('joining a second organisation is written down', () => {
  it('knows when a ground belongs somewhere else', () => {
    expect(isASecondOrganisation('org-a', 'org-b')).toBe(true);
  });

  it('and does nothing for the ordinary case', () => {
    /* Most invites are into the company somebody already belongs to, where the membership exists. */
    expect(isASecondOrganisation('org-a', 'org-a')).toBe(false);
    expect(isASecondOrganisation('org-a', '')).toBe(false);
  });

  it('writes the membership when accepting into another organisation', () => {
    expect(SRC).toContain('isASecondOrganisation(user.organizationId, ground.organizationId)');
    expect(SRC).toContain('organizationMembership.upsert');
  });

  it('as a member, never as whatever they are at home', () => {
    /*
     * Being an admin of your own company says nothing about somebody else's.
     *
     * BOUNDED TO THE MEMBERSHIP WRITE. My first version forbade `role: user.role` anywhere in the
     * file and failed on the JWT two hundred lines below, which correctly carries their HOME role -
     * that is what keeps their own grounds reachable. A guard that cannot tell those two apart
     * would be satisfied by breaking the sign-in.
     */
    expect(GUEST_ROLE).toBe('MEMBER');
    const write = SRC.slice(SRC.indexOf('organizationMembership.upsert'));
    expect(write.slice(0, 400)).toContain('role: GUEST_ROLE');
    expect(write.slice(0, 400)).not.toMatch(/role:\s*user\.role/);
  });

  it('and a second acceptance does not overwrite a role they were given there', () => {
    const block = SRC.slice(SRC.indexOf('organizationMembership.upsert'));
    expect(block.slice(0, 400)).toContain('update: {},');
  });
});
