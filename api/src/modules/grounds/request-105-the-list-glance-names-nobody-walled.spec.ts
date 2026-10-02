import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * REQUEST 105, THE GLANCE ON THE CHECK-INS LIST (and so on Today, which reads this list): what is in the way
 * never names a colleague's wait to a reader who may not read that colleague. Omar's wait for the deck is the
 * oldest; Miriam's is newer. Where people see only themselves, and on an evaluation check-in for anybody but
 * its lead and the admin who set it up, the reader's own waits only.
 */
const LEAD = 'user-lead';
const MIRIAM = 'user-part';
const OMAR = 'user-omar';
const ADMIN = 'user-admin';
const SETUP = 'user-setup';

function ground(over: any = {}): any {
  return {
    id: 'g1', organizationId: 'org1', initiatorId: LEAD, createdByUserId: SETUP, label: 'Sales team, Q3', status: 'ACTIVE',
    scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', timelineDays: 84, updatedAt: new Date('2026-09-20'), restrictExternalVisibility: true,
    participants: [
      { id: 'p-lead', userId: LEAD, email: 'wairimu@baridi.test', partyType: 'INITIATOR', createdAt: new Date('2026-09-01'), user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-part', userId: MIRIAM, email: 'miriam@baridi.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-02'), user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
      { id: 'p-omar', userId: OMAR, email: 'omar@baridi.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-03'), user: { firstName: 'Omar', lastName: 'Ali' } },
    ],
    checkIns: [], report: null, reportRounds: [], reportActivations: [],
    dependencies: [
      { what: 'the new price list', status: 'BLOCKING', createdAt: new Date('2026-09-05'), fromParticipantId: 'p-omar', onParticipantId: null, onLabel: 'the suppliers' },
      { what: 'the delivery van', status: 'WAITING', createdAt: new Date('2026-09-12'), fromParticipantId: 'p-part', onParticipantId: null, onLabel: 'the depot' },
    ],
    ...over,
  };
}

async function listAs(userId: string, role: string, over: any = {}) {
  const prisma: any = {
    ground: { findMany: jest.fn().mockResolvedValue([ground(over)]) },
    groundParticipant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
  const [row] = (await svc.list('org1', userId, `${userId}@baridi.test`, role)) as any[];
  return row.glance.inTheWay;
}

describe('where people see only themselves', () => {
  const hidden = { peersVisibleToEachOther: false };
  it('the lead reads the whole team, with Omar\'s wait as the oldest', async () => {
    expect(await listAs(LEAD, 'MEMBER', hidden)).toMatchObject({ count: 2, oldest: 'the new price list' });
  });
  it('Miriam reads only her own wait, never Omar\'s', async () => {
    expect(await listAs(MIRIAM, 'MEMBER', hidden)).toMatchObject({ count: 1, oldest: 'the delivery van' });
  });
});

describe('on an evaluation check-in (Miriam is the person reviewed)', () => {
  const pip = { scenario: 'PIP', peersVisibleToEachOther: true };
  it('Miriam reads only her own wait', async () => {
    expect(await listAs(MIRIAM, 'MEMBER', pip)).toMatchObject({ count: 1, oldest: 'the delivery van' });
  });
  it('Omar, a colleague giving a view, reads only his own', async () => {
    expect(await listAs(OMAR, 'MEMBER', pip)).toMatchObject({ count: 1, oldest: 'the new price list' });
  });
  it('an admin without access reads nobody\'s wait', async () => {
    expect(await listAs(ADMIN, 'ADMIN', pip)).toMatchObject({ count: 0, oldest: null });
  });
  it('the lead and the admin who set it up read the whole team', async () => {
    expect(await listAs(LEAD, 'MEMBER', pip)).toMatchObject({ count: 2, oldest: 'the new price list' });
    expect(await listAs(SETUP, 'ADMIN', pip)).toMatchObject({ count: 2, oldest: 'the new price list' });
  });
});

/* DECISION 75, ITEM 46: where people see each other, a participant's one line is their own waits too. The list,
   and so Today, which reads it. */
describe('where people see each other on an ordinary check-in', () => {
  const together = { peersVisibleToEachOther: true };
  it('Miriam reads only her own wait, never Omar\'s', async () => {
    const got = await listAs(MIRIAM, 'MEMBER', together);
    expect(got).toMatchObject({ count: 1, oldest: 'the delivery van' });
    expect(JSON.stringify(got)).not.toContain('price list');
  });
  it('Omar reads only his own', async () => {
    expect(await listAs(OMAR, 'MEMBER', together)).toMatchObject({ count: 1, oldest: 'the new price list' });
  });
  it('the lead and an admin who only reads read the whole team', async () => {
    expect(await listAs(LEAD, 'MEMBER', together)).toMatchObject({ count: 2, oldest: 'the new price list' });
    expect(await listAs(ADMIN, 'ADMIN', together)).toMatchObject({ count: 2, oldest: 'the new price list' });
  });
  it('a guest from another organisation who takes part reads only their own', async () => {
    expect(await listAs(MIRIAM, 'GUEST', together)).toMatchObject({ count: 1, oldest: 'the delivery van' });
  });
});
