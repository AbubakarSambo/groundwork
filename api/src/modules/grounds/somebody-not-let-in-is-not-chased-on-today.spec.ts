import { whatNeedsYou, type ListedCheckIn } from './what-needs-you';
import { WhatNeedsYouService } from './what-needs-you.service';

/**
 * Request 95 (a). As Rukia on "Sales team, Q3", Today read "4 of 6 have checked in for session 2;
 * Faraji hasn't yet." Faraji was declined at the door, so he is neither counted nor named.
 */
const NOW = new Date('2026-09-23T09:00:00Z');
const H = 3_600_000;
const ago = (h: number) => new Date(NOW.getTime() - h * H).toISOString();
const RUKIA = 'u-rukia';
const person = (id: string, userId: string, firstName: string, extra: any = {}) => ({ id, userId, user: { firstName }, ...extra });

const names = ['Rukia', 'Amani', 'Neema', 'Omar', 'Brian', 'Faraji'];
const ids = names.map((n) => `p-${n}`);
const sales = (faraji: any): ListedCheckIn => ({
  id: 'g-sales', label: 'Sales team, Q3', status: 'ACTIVE', organizationId: 'org', initiatorId: RUKIA,
  participants: names.map((n, i) => (n === 'Faraji' ? person(ids[i], 'u-Faraji', n, faraji) : person(ids[i], n === 'Rukia' ? RUKIA : `u-${n}`, n))),
  checkIns: [
    ...ids.map((id, i) => ({ id: `c1-${i}`, participantId: id, sessionNumber: 1, status: i < 5 ? 'COMPLETED' : 'NOT_STARTED', availableFrom: ago(60), completedAt: i < 5 ? ago(50) : null })),
    ...ids.map((id, i) => ({ id: `c2-${i}`, participantId: id, sessionNumber: 2, status: i < 4 ? 'COMPLETED' : 'NOT_STARTED', availableFrom: ago(5), completedAt: i < 4 ? ago(2) : null })),
  ],
  glance: { progress: { roundsDone: 1, roundsPlanned: 12, answeredThisRound: 4, ofPeople: 6, waitingOn: ['p-Brian', 'p-Faraji'].slice(0, 2) } },
});

describe('Today as Rukia, who runs the sales team', () => {
  it('before: Faraji, declined at the door, was counted and named', () => {
    // The list counts him as waiting until Today is told he was not let in.
    const r = whatNeedsYou([sales(undefined)], { userId: RUKIA, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.line).toBe('In Sales team, Q3, 4 of 6 have checked in for the second check-in. Brian and Faraji have not checked in yet.');
  });

  it('after: he is neither counted nor named, in full sentences', () => {
    const r = whatNeedsYou([sales({ notLetIn: true })], { userId: RUKIA, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.line).toBe('In Sales team, Q3, 4 of 5 have checked in for the second check-in. Brian has not checked in yet.');
    expect(r.line).not.toMatch(/Faraji|session|;/);
  });

  it('says nothing about a session when only the declined person is left', () => {
    const g = sales({ notLetIn: true });
    g.glance = { progress: { roundsDone: 1, roundsPlanned: 12, answeredThisRound: 5, ofPeople: 6, waitingOn: ['p-Faraji'] } };
    const r = whatNeedsYou([g], { userId: RUKIA, role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.line ?? '').not.toMatch(/Faraji/);
    expect(r.line ?? '').not.toMatch(/of 5 have checked in/);
  });
});

describe('Today as Amani, a participant in the same check-in', () => {
  it('is told no count and no names of others', () => {
    const r = whatNeedsYou([sales({ notLetIn: true })], { userId: 'u-Amani', role: 'MEMBER', organizationId: 'org' }, [], NOW);
    expect(r.line ?? '').not.toMatch(/Faraji|Brian|of \d/);
  });
});

describe('the service reads who an admin declined, through the one function the board uses', () => {
  it('marks only the person whose latest request was declined', async () => {
    const list = [sales(undefined)] as any[];
    list[0].participants[5].user.awaitingOrgApproval = true;
    const prisma: any = {
      user: { findUnique: async () => ({ awaitingOrgApproval: false }) },
      membershipRequest: { findMany: async () => [{ userId: 'u-Faraji', status: 'DECLINED', decidedByUserId: 'u-admin', decidedAt: new Date() }] },
    };
    const svc = new WhatNeedsYouService(prisma, { list: async () => list, listAwaitingApproval: async () => [] } as any);
    const r = await svc.forReader(RUKIA, 'rukia@example.test', 'org', 'MEMBER');
    expect(r.line).toBe('In Sales team, Q3, 4 of 5 have checked in for the second check-in. Brian has not checked in yet.');
  });
});
