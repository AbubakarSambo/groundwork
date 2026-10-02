import { adminsThisOrg, runsIt, whatTheyMayRead, maySee, groundsAViewerMayList } from './who-may-read-this-check-in';

/**
 * ONE RULE DECIDES WHO READS A CHECK-IN. Fourteen local formulas in two shapes used to. This is the
 * one, and it answers in three levels, because the damage came from nobody-or-the-lead.
 */
const checkIn = { organizationId: 'org', scenario: 'NEW_PROJECT' as const, initiatorId: 'lead', createdByUserId: 'setter', participants: [{ userId: 'party' }, { userId: null }] };

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
    /* Changed with request 78: an admin's list is no longer the whole organisation. It leaves out a
       performance plan, a promotion and a renewal the admin was not given access to; the new tests
       below read the clause itself. Everything else an admin lists is unchanged. */
    const adminList = groundsAViewerMayList('a', { role: 'ADMIN', organizationId: 'org' }, 'org') as any;
    expect(adminList.organizationId).toBe('org');
    expect(adminList.OR[0]).toEqual({ scenario: { notIn: expect.arrayContaining(['CONTRACT_RENEWAL', 'RECOGNITION', 'PIP']) } });
    expect(groundsAViewerMayList(undefined, null, 'org')).toEqual({ organizationId: 'org' });
    const mine = groundsAViewerMayList('m', { role: 'MEMBER', organizationId: 'org' }, 'org') as any;
    expect(mine.OR).toEqual([{ initiatorId: 'm' }, { createdByUserId: 'm' }, { participants: { some: { userId: 'm' } } }]);
  });
});


/**
 * DECISION 5, REQUEST 78: AN ADMIN READS A PERFORMANCE PLAN, A PROMOTION OR A RENEWAL ONLY WHEN GIVEN
 * ACCESS TO IT, THAT IS WHEN THEY RUN IT, SET IT UP, OR TAKE PART IN IT. Otherwise it is as if they were
 * not an admin: they may not see it at all.
 */
describe('an admin and the three evaluation check-ins', () => {
  const admin = (id: string) => ({ role: 'ADMIN', organizationId: 'org', userId: id });
  for (const scenario of ['PIP', 'RECOGNITION', 'CONTRACT_RENEWAL'] as const) {
    describe(scenario, () => {
      const ci = { organizationId: 'org', scenario, initiatorId: 'lead', createdByUserId: 'setter', participants: [{ userId: 'party' }, { userId: 'admin-in-it' }] };
      it('an admin with no access may not see it, at any level', () => {
        expect(adminsThisOrg(admin('other-admin'), ci)).toBe(false);
        expect(runsIt('other-admin', admin('other-admin'), ci)).toBe(false);
        expect(whatTheyMayRead('other-admin', admin('other-admin'), ci)).toBeNull();
        expect(maySee('other-admin', admin('other-admin'), ci)).toBe(false);
      });
      it('an admin who set it up reads it', () => {
        expect(whatTheyMayRead('setter', admin('setter'), ci)).toBe('lead');
        expect(maySee('setter', admin('setter'), ci)).toBe(true);
      });
      it('an admin who runs it reads it', () => {
        expect(whatTheyMayRead('lead', admin('lead'), ci)).toBe('lead');
      });
      it('an admin who takes part in it reads it as a person in it does', () => {
        expect(whatTheyMayRead('admin-in-it', admin('admin-in-it'), ci)).toBe('own');
      });
      it('a viewer whose user id is not known is refused, never let through', () => {
        expect(adminsThisOrg({ role: 'ADMIN', organizationId: 'org' }, ci)).toBe(false);
      });
      it('a caller that forgot to select the scenario is treated as the strictest case', () => {
        expect(adminsThisOrg(admin('other-admin'), { ...ci, scenario: undefined })).toBe(false);
        expect(adminsThisOrg(admin('setter'), { ...ci, scenario: undefined })).toBe(true);
      });
    });
  }

  it('on every other check-in an admin of the organisation still reads everything', () => {
    /* NEW_HIRE left this list with decision 75, item 25: a probation is an evaluation check-in now. */
    for (const scenario of ['NEW_PROJECT', 'NEW_MANAGER', 'PULSE_CHECK', 'COHORT_CHECK', 'DRIFT'] as const) {
      const ci = { organizationId: 'org', scenario, initiatorId: 'lead', participants: [] };
      expect(whatTheyMayRead('any-admin', admin('any-admin'), ci)).toBe('lead');
    }
  });

  it('the list leaves out the three for an admin without access, and keeps what they run, set up or take part in', () => {
    const list = groundsAViewerMayList('a1', { role: 'ADMIN', organizationId: 'org' }, 'org') as any;
    expect(list.OR).toEqual([
      { scenario: { notIn: expect.arrayContaining(['PIP', 'RECOGNITION', 'CONTRACT_RENEWAL']) } },
      { initiatorId: 'a1' },
      { createdByUserId: 'a1' },
      { participants: { some: { userId: 'a1' } } },
      /* Decision 75, item 2: one waiting for an admin to accept it, and one this admin decided. */
      { status: 'AWAITING_APPROVAL' },
      { approvedById: 'a1' },
    ]);
    /* Four since decision 75, item 25 added a probation (NEW_HIRE). */
    expect(list.OR[0].scenario.notIn).toHaveLength(4);
  });

  it('the list of three is the one isEvaluationCheckIn uses', () => {
    const { EVALUATION_SCENARIOS, isEvaluationCheckIn } = require('../reports/is-this-an-evaluation-check-in');
    for (const s of EVALUATION_SCENARIOS) expect(isEvaluationCheckIn(s)).toBe(true);
    expect([...EVALUATION_SCENARIOS].sort()).toEqual(['CONTRACT_RENEWAL', 'NEW_HIRE', 'PIP', 'RECOGNITION']);
  });
});
