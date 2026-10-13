import { EVALUATION_SCENARIOS } from '../reports/is-this-an-evaluation-check-in';
import { whatTheyMayRead, maySee, groundsAViewerMayList } from './who-may-read-this-check-in';

/**
 * PRIVACY SWEEP, HIGH. A lead in the same department, not in the check-in, not an admin and not the person's manager, was given GET /grounds/:id
 * (the brief, what participants are told, members' commitments) for a new hire, a performance plan, a promotion, a renewal or a probation. The
 * board and the report already refused her. The department rule now leaves out evaluation check-ins exactly as the admin rule does.
 */
const ORG = 'org1';
const base = { organizationId: ORG, initiatorId: 'u-manager', createdByUserId: null, status: 'ACTIVE', approvedById: null, leadDepartment: 'Sales', participants: [{ userId: 'u-hire', email: 'hire@x.test' }] };
const lead = { role: 'LEAD', organizationId: ORG, department: 'Sales', email: 'other.lead@x.test' };
const admin = { role: 'ADMIN', organizationId: ORG, department: null, email: 'grace@x.test' };

describe('a lead in the same department', () => {
  it('reads an ordinary check-in her colleague runs, as before', () => {
    expect(whatTheyMayRead('u-lead', { ...lead, userId: 'u-lead' }, { ...base, scenario: 'OKR_ALIGNMENT' } as any)).toBe('shared');
  });
  for (const scenario of EVALUATION_SCENARIOS) {
    it(`reads nothing of ${scenario}, which is an evaluation`, () => {
      expect(whatTheyMayRead('u-lead', { ...lead, userId: 'u-lead' }, { ...base, scenario } as any)).toBeNull();
    });
  }
});

describe('the list, built from the same rule', () => {
  it('names the department\'s leads only for check-ins that are not evaluations', () => {
    const where: any = groundsAViewerMayList('u-lead', { ...lead, userId: 'u-lead' } as any, ORG, ['u-manager']);
    const clause = where.OR.find((c: any) => c.initiatorId?.in);
    expect(clause.initiatorId.in).toEqual(['u-manager']);
    expect(clause.scenario.notIn.length).toBeGreaterThan(0);
  });
});

describe('everybody else is as they were', () => {
  it('an admin with no access reads nothing of an evaluation, and the person in it reads their own', () => {
    const c = { ...base, scenario: EVALUATION_SCENARIOS[0] } as any;
    expect(maySee('u-grace', { ...admin, userId: 'u-grace' } as any, c)).toBe(false);
    expect(whatTheyMayRead('u-hire', { role: 'MEMBER', organizationId: ORG, userId: 'u-hire' } as any, c)).toBe('own');
    expect(whatTheyMayRead('u-manager', { role: 'LEAD', organizationId: ORG, userId: 'u-manager' } as any, c)).toBe('lead');
  });
});
