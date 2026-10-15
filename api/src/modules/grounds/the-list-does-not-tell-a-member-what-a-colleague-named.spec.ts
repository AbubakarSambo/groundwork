import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * DECISION 121, ITEM 5, on GET /grounds (the check-ins list, which Today reads). What the room is about carries, for each place and thing, the
 * person who named it. The list served it raw to every reader, so a member where people do not see each other read where a colleague works,
 * and which aims a colleague holds. The check-in's own page applied the wall; the list now applies the same one.
 */
const LEAD = 'user-lead';
const MIRIAM = 'user-part';
const OMAR = 'user-omar';
const ROOM = {
  aims: [{ aim: 'Get fresh produce to the shops before they close', held: ['Miriam Wanjiku', 'Omar Ali'] }],
  places: [{ name: 'Kilimani', named: ['Omar Ali'] }, { name: 'Westlands', named: ['Miriam Wanjiku'] }],
  things: [{ name: 'mango', named: ['Omar Ali'] }],
};

function ground(over: any = {}): any {
  return {
    id: 'g1', organizationId: 'org1', initiatorId: LEAD, createdByUserId: null, label: 'Fresh produce team', status: 'ACTIVE',
    scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', timelineDays: 84, updatedAt: new Date('2026-09-20'), restrictExternalVisibility: false,
    whatTheRoomIsAbout: ROOM, whatTheRoomIsAboutSession: 2,
    participants: [
      { id: 'p-lead', userId: LEAD, email: 'wairimu@baridi.test', partyType: 'INITIATOR', createdAt: new Date('2026-09-01'), user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-part', userId: MIRIAM, email: 'miriam@baridi.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-02'), user: { firstName: 'Miriam', lastName: 'Wanjiku' } },
      { id: 'p-omar', userId: OMAR, email: 'omar@baridi.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-03'), user: { firstName: 'Omar', lastName: 'Ali' } },
    ],
    checkIns: [], report: null, reportRounds: [], reportActivations: [], dependencies: [],
    ...over,
  };
}

async function roomAs(userId: string, role: string, over: any = {}) {
  const prisma: any = {
    ground: { findMany: jest.fn().mockResolvedValue([ground(over)]) },
    groundParticipant: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
  const [row] = (await svc.list('org1', userId, `${userId}@baridi.test`, role)) as any[];
  return row.whatTheRoomIsAbout;
}

describe('the check-ins list, where people do not see each other', () => {
  const hidden = { peersVisibleToEachOther: false };

  it('Miriam does not read where Omar works, what he named or his name', async () => {
    const text = JSON.stringify(await roomAs(MIRIAM, 'MEMBER', hidden));
    expect(text).not.toContain('Kilimani');
    expect(text).not.toContain('mango');
    expect(text).not.toContain('Omar');
  });

  it('she still reads what is her own', async () => {
    expect(JSON.stringify(await roomAs(MIRIAM, 'MEMBER', hidden))).toContain('Westlands');
  });

  it('Wairimu, who runs it, reads all of it', async () => {
    const text = JSON.stringify(await roomAs(LEAD, 'MEMBER', hidden));
    for (const word of ['Kilimani', 'Westlands', 'mango', 'Omar Ali', 'Miriam Wanjiku']) expect(text).toContain(word);
  });
});

describe('the check-ins list, where people see each other', () => {
  it('Miriam reads the room as before, with the names', async () => {
    const text = JSON.stringify(await roomAs(MIRIAM, 'MEMBER', { peersVisibleToEachOther: true }));
    expect(text).toContain('Kilimani');
    expect(text).toContain('Omar Ali');
  });
});
