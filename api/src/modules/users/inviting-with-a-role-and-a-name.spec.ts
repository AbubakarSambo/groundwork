import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { addressesIn, namesIn, planFor } from './putting-a-whole-company-on';
import { aRoleToInviteAs, HOW_A_NEW_ORG_ADDS_PEOPLE } from './the-role-an-invitation-gives';

/**
 * "INVITE PEOPLE. One per line: a name and an email. Or paste a list from a spreadsheet." with the
 * role chosen underneath: Admin, Can open check-ins, Takes part. (A4 people.txt, U.4.)
 */
describe('a name and an email, one per line', () => {
  it('takes the address and keeps the name, written with a comma, a tab, or a space', () => {
    const pasted = 'Ada Obi, ada@x.com\nBen\tben@x.com\nChi Eze chi@x.com';
    expect(addressesIn(pasted)).toEqual(['ada@x.com', 'ben@x.com', 'chi@x.com']);
    expect([...namesIn(pasted)]).toEqual([['ada@x.com', 'Ada Obi'], ['ben@x.com', 'Ben'], ['chi@x.com', 'Chi Eze']]);
  });

  it('still splits a mail client\'s To field, and still reports a typo on its own row', () => {
    expect(addressesIn('a@x.com, b@x.com; c@x.com')).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
    expect(planFor('a@x.com, oops, b@x.com', () => false, null).map((r) => r.result)).toEqual(['invited', 'not an email', 'invited']);
    expect(namesIn('a@x.com, b@x.com').size).toBe(0);
  });
});

describe('the role an invitation gives', () => {
  /* The rule now also takes who is inviting and the organisation's two settings (Hafsah, 21 November 2026). These are an admin
     inviting under the defaults, which is what every invitation was before; what each expects is unchanged. */
  const anAdmin = (role: string | undefined) => aRoleToInviteAs(role, 'ADMIN', HOW_A_NEW_ORG_ADDS_PEOPLE);
  it('is one of the three the page offers, and a member when none is chosen', () => {
    expect(anAdmin('ADMIN')).toBe('ADMIN');
    expect(anAdmin('LEAD')).toBe('LEAD');
    expect(anAdmin(undefined)).toBe('MEMBER');
  });
  it('anything else is refused in a sentence, never read as a member', () => {
    expect(() => anAdmin('OWNER')).toThrow(new BadRequestException('Choose Admin, Can open check-ins, or Takes part.'));
    expect(() => anAdmin('GUEST')).toThrow(BadRequestException);
  });
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('reaches the account an invitation makes, and the membership of somebody who has one elsewhere', () => {
    const auth = strip(readFileSync(join(__dirname, '..', 'auth', 'auth.service.ts'), 'utf8'));
    expect(auth).toMatch(/data: \{ organizationId, email: lower, firstName, lastName, role: inviterOrganizationId \? role : 'MEMBER', isEmailVerified: false \}/);
    expect(auth).toMatch(/data: \{ userId: user\.id, organizationId: inviterOrganizationId, role \},/);
    const users = strip(readFileSync(join(__dirname, 'users.service.ts'), 'utf8'));
    expect(users).toMatch(/this\.auth\.teamInvite\(orgName, row\.email, organizationId, \{ role, name: names\.get\(row\.email\) \?\? null \}\)/);
  });
});

describe('a typo beside an address is still a typo', () => {
  it('"oops, b@x.com" is not somebody called Oops', () => {
    expect(namesIn('oops, b@x.com').size).toBe(0);
    expect(planFor('oops, b@x.com', () => false, 1).map((r) => r.result)).toEqual(['not an email', 'invited']);
  });
});
