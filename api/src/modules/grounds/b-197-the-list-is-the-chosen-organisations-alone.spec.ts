import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * B-197. Neema is in two organisations, Msingi Foods and Lakeview Clinic. With Msingi Foods chosen, the list of check-ins
 * (which Today, You, the switcher and Ask's picker read) holds Msingi Foods' check-ins and nothing of Lakeview Clinic's.
 */
const ground = (id: string, organizationId: string, label: string): any => ({
  id, organizationId, initiatorId: 'lead', createdByUserId: 'lead', label, status: 'ACTIVE', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', timelineDays: 84,
  updatedAt: new Date('2026-09-20'), restrictExternalVisibility: true,
  participants: [{ id: `p-${id}`, userId: 'neema', email: 'neema@x.test', partyType: 'PARTICIPANT', createdAt: new Date('2026-09-02'), user: { firstName: 'Neema', lastName: 'Kamau' } }],
  checkIns: [], report: null, reportRounds: [], reportActivations: [], dependencies: [],
});

async function neemasList(chosen: string) {
  const all = [ground('g-msingi', 'org-msingi', 'Sales team, Q4'), ground('g-lakeview', 'org-lakeview', 'Clinic rota')];
  const prisma: any = {
    ground: { findMany: jest.fn(async ({ where }: any) => (where?.id?.in ? all.filter((g) => where.id.in.includes(g.id)) : all.filter((g) => g.organizationId === chosen))) },
    groundParticipant: {
      updateMany: jest.fn(async () => ({ count: 0 })),
      findMany: jest.fn(async ({ where }: any) => (where?.ground?.organizationId?.not ? all.filter((g) => g.organizationId !== chosen).map((g) => ({ groundId: g.id })) : [])),
    },
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const svc = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => reports } as any);
  return ((await svc.list(chosen, 'neema', 'neema@x.test', 'MEMBER')) as any[]).map((g) => g.label);
}

describe('B-197: someone in two organisations reads the chosen one\'s check-ins only', () => {
  it('with Msingi Foods chosen, Lakeview Clinic\'s check-in is not in the list', async () => {
    expect(await neemasList('org-msingi')).toEqual(['Sales team, Q4']);
  });
  it('with Lakeview Clinic chosen, Msingi Foods\' check-in is not in the list', async () => {
    expect(await neemasList('org-lakeview')).toEqual(['Clinic rota']);
  });
});
