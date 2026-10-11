import { ConflictException } from '@nestjs/common';
import { aTimeSheetsOrganisation, roles, TODAY } from './a-time-sheets-organisation-for-specs';
import { aRequestsHistory } from './a-request-is-recorded';

/**
 * TWO ANSWERS AT ONCE ON HOURS, AS EACH READER READS IT (suites at scale). Baridi Appliances, Wednesday 7 October 2026.
 *
 * Kamau, who has no manager, sends 2 hours on Naivas, so any admin approves them. Grace and Omar are both admins here. When both
 * answer at the same moment, one answer is kept and the other approver reads who got there first, and nothing of theirs is written,
 * recorded or sent. The same as leave and spending (a-request-is-answered-once.ts): the write is the check.
 */

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(TODAY); roles['u-omar'] = 'ADMIN'; });
afterEach(() => { jest.useRealTimers(); roles['u-omar'] = 'MEMBER'; });

function kamausHours() {
  const o = aTimeSheetsOrganisation();
  o.entries.push({ organizationId: 'org-baridi', userId: 'u-kamau', client: 'Naivas', onDay: new Date('2026-10-05T00:00:00Z'), minutes: 120, createdAt: TODAY } as any);
  return o;
}

describe('two admins approve the same hours at the same moment', () => {
  it('one is kept, the other is told who got there first, and the person is told once', async () => {
    const o = kamausHours();
    const results = await Promise.allSettled([
      o.svc.approve(o.as('u-grace'), 'u-kamau', '2026-10-05', TODAY),
      o.svc.approve(o.as('u-omar'), 'u-kamau', '2026-10-05', TODAY),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    const lost = (results[1] as PromiseRejectedResult).reason;
    expect(lost).toBeInstanceOf(ConflictException);
    expect(lost.message).toBe('Grace approved these hours a moment ago, so your answer was not kept.');
    expect(o.weeks.filter((w) => w.userId === 'u-kamau')).toHaveLength(1);
    expect(o.weeks.find((w) => w.userId === 'u-kamau')).toMatchObject({ approvedMinutes: 120, approvedById: 'u-grace' });
    expect(o.events.filter((e) => e.suite === 'time' && e.kind === 'approved')).toHaveLength(1);
    expect((await aRequestsHistory(o.prisma, 'org-baridi', 'time', 'u-kamau|2026-10-05', 'u-kamau')).said.filter((s) => /approved/.test(s))).toEqual(['Grace approved these hours on 7 October.']);
  });

  it('the same the other way round, and an answer after the hours were approved reads what it always did', async () => {
    const o = kamausHours();
    const results = await Promise.allSettled([
      o.svc.approve(o.as('u-omar'), 'u-kamau', '2026-10-05', TODAY),
      o.svc.approve(o.as('u-grace'), 'u-kamau', '2026-10-05', TODAY),
    ]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect((results[1] as PromiseRejectedResult).reason.message).toBe('Omar approved these hours a moment ago, so your answer was not kept.');
    expect(o.weeks.find((w) => w.userId === 'u-kamau')).toMatchObject({ approvedById: 'u-omar' });
  });
});
