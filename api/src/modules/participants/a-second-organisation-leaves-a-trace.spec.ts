import * as fs from 'fs';
import * as path from 'path';
import { isASecondOrganisation, GUEST_ROLE } from './joining-a-second-organisation';

/**
 * THREE PATHS MADE SOMEBODY PART OF A SECOND COMPANY AND WROTE NOTHING DOWN.
 *
 * Accepting a participant invite has written a membership for a while. Being made the LEAD of a
 * check-in in somebody else's organisation did not, and neither did joining one from a broadcast
 * link — so the organisation never appeared in their switcher, and every organisation-scoped read
 * returned nothing, because their token still carries their home organisation.
 *
 * The person was told they were leading something they could not open. Nothing leaked; what broke
 * was their ability to reach the thing they had been given.
 */
const read = (p: string) =>
  fs.readFileSync(path.join(__dirname, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const GROUNDS = read('../grounds/grounds.service.ts');
const ENTRY = read('../entry/entry.service.ts');
const PARTICIPANTS = read('participants.service.ts');

describe('the rule', () => {
  it('a ground in your own organisation is not a second one', () => {
    expect(isASecondOrganisation('org-a', 'org-a')).toBe(false);
  });

  it('and one somewhere else is', () => {
    expect(isASecondOrganisation('org-a', 'org-b')).toBe(true);
  });

  it('the role written is GUEST, never the one they hold at home', () => {
    /* Being an admin of your own company says nothing about what you should be able to do in
       somebody else's. */
    expect(GUEST_ROLE).toBe('GUEST');
  });
});

describe('every path that reuses an existing account writes one', () => {
  it.each([
    ['accepting a participant invite', PARTICIPANTS],
    ['being made the lead of somebody else’s check-in', GROUNDS],
    ['joining from a broadcast link', ENTRY],
  ])('%s', (_name, src) => {
    expect(src).toContain('isASecondOrganisation');
    expect(src).toContain('organizationMembership.upsert');
    expect(src).toContain('role: GUEST_ROLE');
  });

  it('and none of them overwrites a role somebody already has there', () => {
    /* `update: {}` on the upsert. A second acceptance must not demote somebody who was later made
       an admin of that organisation for real. */
    for (const src of [PARTICIPANTS, GROUNDS, ENTRY]) {
      const at = src.indexOf('organizationMembership.upsert');
      expect(src.slice(at, at + 400)).toMatch(/update:\s*\{\s*\}/);
    }
  });

  it('and the lead path only writes one when it is genuinely a second organisation', () => {
    /* Writing one for somebody's own organisation would put a GUEST membership beside their real
       role and make the switcher show their own company twice. */
    const at = GROUNDS.indexOf('const existing = await db.user.findUnique');
    const branch = GROUNDS.slice(at, at + 900);
    expect(branch.indexOf('isASecondOrganisation')).toBeLessThan(branch.indexOf('organizationMembership.upsert'));
  });
});
