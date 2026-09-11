import { adminsThisOrg, runsIt, whatTheyMayRead, maySee, groundsAViewerMayList } from './who-may-read-this-check-in';

/**
 * ONE RULE DECIDES WHO READS A CHECK-IN. Fourteen local formulas in two shapes used to. This is the
 * one, and it answers in three levels, because the damage came from nobody-or-the-lead.
 */
const checkIn = { organizationId: 'org', initiatorId: 'lead', createdByUserId: 'setter', participants: [{ userId: 'party' }, { userId: null }] };

describe('the rule', () => {
  it('an admin of THIS organisation runs it; an admin of another is a stranger', () => {
    expect(adminsThisOrg({ role: 'ADMIN', organizationId: 'org' }, checkIn)).toBe(true);
    expect(adminsThisOrg({ role: 'ADMIN', organizationId: 'other' }, checkIn)).toBe(false);
    expect(adminsThisOrg({ role: 'MEMBER', organizationId: 'org' }, checkIn)).toBe(false);
    expect(adminsThisOrg(null, checkIn)).toBe(false);
  });

  it('the lead and the admin run it; the setting-up admin reads as the lead but does not run it', () => {
    expect(runsIt('lead', { role: 'MEMBER', organizationId: 'org' }, checkIn)).toBe(true);
    expect(runsIt('setter', { role: 'MEMBER', organizationId: 'org' }, checkIn)).toBe(false);
    expect(whatTheyMayRead('setter', { role: 'MEMBER', organizationId: 'org' }, checkIn)).toBe('lead');
    expect(whatTheyMayRead('lead', null, checkIn)).toBe('lead');
    expect(whatTheyMayRead('x', { role: 'ADMIN', organizationId: 'org' }, checkIn)).toBe('lead');
  });

  it('a participant reads their own; a member of the organisation who is none of these reads nothing', () => {
    expect(whatTheyMayRead('party', { role: 'MEMBER', organizationId: 'org' }, checkIn)).toBe('own');
    expect(whatTheyMayRead('stranger', { role: 'MEMBER', organizationId: 'org' }, checkIn)).toBeNull();
    expect(maySee('stranger', { role: 'ADMIN', organizationId: 'other' }, checkIn)).toBe(false);
  });

  it('the list is the same rule as a query, and keeps the set-up-by case', () => {
    expect(groundsAViewerMayList('a', { role: 'ADMIN', organizationId: 'org' }, 'org')).toEqual({ organizationId: 'org' });
    expect(groundsAViewerMayList(undefined, null, 'org')).toEqual({ organizationId: 'org' });
    const mine = groundsAViewerMayList('m', { role: 'MEMBER', organizationId: 'org' }, 'org') as any;
    expect(mine.OR).toEqual([{ initiatorId: 'm' }, { createdByUserId: 'm' }, { participants: { some: { userId: 'm' } } }]);
  });
});
