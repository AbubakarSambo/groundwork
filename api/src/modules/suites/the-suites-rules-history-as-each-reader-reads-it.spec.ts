import { ForbiddenException } from '@nestjs/common';
import { SuitesService, RULES_HISTORY_REFUSED } from './suites.service';

/**
 * EACH CHANGE OF THE SUITES' RULES IS KEPT (decision 85, build step 5), AS EACH READER READS IT.
 *
 * `OrganizationSuite.answers` keeps only the last answers. Baridi Appliances: Grace, an admin, switches
 * leave requests on, changes the days, names Omar for finance, sets the approval steps, and switches
 * leave requests off. Grace reads who changed what, when, and from what to what. Wairimu, a lead, Omar,
 * a member, and Tomas, a guest, read none of it.
 */

const ORG = 'org-baridi';
const roles: Record<string, string> = { 'u-grace': 'ADMIN', 'u-wairimu': 'LEAD', 'u-omar': 'MEMBER', 'u-tomas': 'GUEST' };
const names: Record<string, [string, string]> = { 'u-grace': ['Grace', 'Achieng'], 'u-wairimu': ['Wairimu', 'Kamau'], 'u-omar': ['Omar', 'Abdi'], 'u-tomas': ['Tomas', 'Guest'] };
const clock = { now: new Date('2026-10-01T08:00:00Z') };

function setup() {
  const suites: Record<string, any> = {};
  const changes: any[] = [];
  const prisma: any = {
    organizationSuite: {
      findUnique: jest.fn(async ({ where }: any) => suites[where.organizationId_suite.suite] ?? null),
      findMany: jest.fn(async () => Object.entries(suites).map(([suite, r]) => ({ suite, ...r }))),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.organizationId_suite.suite;
        suites[k] = suites[k] ? { ...suites[k], ...update } : { ...create };
        return suites[k];
      }),
    },
    organizationMembership: {
      findUnique: jest.fn(async ({ where }: any) => (roles[where.userId_organizationId.userId] ? { role: roles[where.userId_organizationId.userId] } : null)),
      findMany: jest.fn(async () => Object.keys(roles).filter((u) => roles[u] !== 'GUEST').map((u) => ({ userId: u, user: { firstName: names[u][0], lastName: names[u][1] } }))),
    },
    person: { findMany: jest.fn(async () => [{ department: 'Sales' }, { department: 'Finance' }]) },
    suiteRuleChange: {
      create: jest.fn(async ({ data }: any) => { changes.push({ changedAt: clock.now, ...data }); return data; }),
      findMany: jest.fn(async () => [...changes].reverse()),
    },
  };
  return { svc: new SuitesService(prisma), as: (u: string) => ({ userId: u, organizationId: ORG }), changes };
}

async function graceChangesTheRules(s: ReturnType<typeof setup>) {
  clock.now = new Date('2026-10-01T08:00:00Z');
  await s.svc.switch(s.as('u-grace'), 'leave', { on: true, answers: { days: 21, approver: 'Their manager' } });
  clock.now = new Date('2026-10-02T08:00:00Z');
  await s.svc.switch(s.as('u-grace'), 'leave', { on: true, answers: { days: 25, approver: 'Their manager' } });
  /* The same answers again change nothing, so nothing is kept. */
  await s.svc.switch(s.as('u-grace'), 'leave', { on: true, answers: { days: 25, approver: 'Their manager' } });
  clock.now = new Date('2026-10-03T08:00:00Z');
  await s.svc.setDuties(s.as('u-grace'), { finance: 'u-omar' });
  await s.svc.setWorkflows(s.as('u-grace'), { leave: { steps: [['manager', 'admin'], ['finance', 'admin']] } });
  clock.now = new Date('2026-10-04T08:00:00Z');
  await s.svc.switch(s.as('u-grace'), 'leave', { on: false });
}

describe('Grace, an admin', () => {
  it('reads each change, newest first, with who, when, and from what to what', async () => {
    const s = setup();
    await graceChangesTheRules(s);
    const { changes } = await s.svc.rulesHistory(s.as('u-grace'));
    expect(changes.map((c) => [c.said, c.details])).toEqual([
      ['Grace switched off leave requests on 4 October.', []],
      ['Grace changed the approval steps on 3 October.', [
        'The approval steps for leave requests changed. A leave request goes first to the person’s manager, or else an admin, and then to whoever looks after finance, or else an admin. Each approval sends it to the next step, and only the last step ends it. A decline ends it at any step. Groundwork never passes leave requests on by itself. An admin can set a number of working days after which it does.',
      ]],
      ['Grace changed who holds each duty on 3 October.', ['The answer to “Who looks after finance?” was set to Omar Abdi.']],
      ['Grace changed the answers for leave requests on 2 October.', ['The answer to “How many days of leave does each person have in a year?” changed from 21 to 25.']],
      ['Grace switched on leave requests on 1 October.', [
        'The answer to “How many days of leave does each person have in a year?” was set to 21.',
        /* Changed 22 November 2026: Batch S took the approver question out of leave (who approves is the rules now), so the history says only the
           answers to the questions leave still asks, and an answer to a question it no longer asks is not kept. */
      ]],
    ]);
    expect(changes[3].before).toEqual({ isOn: true, answers: { days: 21 } });
    expect(changes[3].after).toEqual({ isOn: true, answers: { days: 25 } });
    expect(changes.every((c) => c.by === 'Grace')).toBe(true);
  });
});

describe('nobody else reads how the rules were changed', () => {
  for (const u of ['u-wairimu', 'u-omar', 'u-tomas', 'u-gone']) {
    it(`${u.slice(2)} is refused`, async () => {
      const s = setup();
      await graceChangesTheRules(s);
      await expect(s.svc.rulesHistory(s.as(u))).rejects.toThrow(new ForbiddenException(RULES_HISTORY_REFUSED));
    });
  }
});
