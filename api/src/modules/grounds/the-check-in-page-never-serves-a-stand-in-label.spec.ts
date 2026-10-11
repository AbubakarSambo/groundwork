import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * DECISION 139, ITEM 1: "PARTICIPANT A" REACHES NOBODY, ON THE CHECK-IN PAGE.
 *
 * Read in the final evaluation (11 October 2026, profiles 4 and 5): the check-in page served to the lead
 * and to the admin held the stored report's agreements and differences exactly as they were kept,
 * "The price list has been sent by Participant B." and "Participant A's latest update counts 31 shops on
 * the list.". The shared picture beside them had names in; these two lists never went through the door.
 *
 * Read here as the real readers, through `GroundsService.get()`, the read behind GET /grounds/:id.
 */
const PICTURE = 'The initiator and Participant A agree on the catalogue.';
const AGREED = 'The price list has been sent by Participant B.';
const DIFFERENCE = { topic: 'The shop list', positions: [{ participantLabel: 'Participant A', view: "Participant A's latest update counts 31 shops on the list." }, { participantLabel: 'Participant B', view: 'Participant B counts 22.' }], evidence: ['Participant A said 31.'] };

function serviceFor(viewerRole: string, sharedAs: string | null = null) {
  const participants = [
    { id: 'pL', userId: 'userLead', email: 'wairimu@example.test', partyType: 'INITIATOR', roleAsDescribed: null, user: { firstName: 'Wairimu', lastName: 'Njoroge' }, createdAt: new Date('2026-08-31') },
    { id: 'pA', userId: 'userKevin', email: 'kevin@example.test', partyType: 'PARTICIPANT', roleAsDescribed: null, user: { firstName: 'Kevin', lastName: 'Odhiambo' }, createdAt: new Date('2026-09-01') },
    { id: 'pB', userId: 'userFatuma', email: 'fatuma@example.test', partyType: 'PARTICIPANT', roleAsDescribed: null, user: { firstName: 'Fatuma', lastName: 'Bello' }, createdAt: new Date('2026-09-02') },
  ];
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'userLead', createdAt: new Date(), scenario: 'OKR_ALIGNMENT',
    peersVisibleToEachOther: true, timelineDays: null, restrictExternalVisibility: false,
    participants,
    checkIns: [
      { id: 'cA', participantId: 'pA', sessionNumber: 1, status: 'COMPLETED' },
      { id: 'cB', participantId: 'pB', sessionNumber: 1, status: 'COMPLETED' },
    ],
    resolution: null, patternDetections: [],
    report: {
      id: 'r1', releasedAt: new Date(), sharedPicture: PICTURE, theOpening: null, sharedAs,
      createdAt: new Date(), agreements: [AGREED], divergences: [DIFFERENCE],
    },
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    checkIn: { aggregate: async () => ({ _max: { sessionNumber: 1 } }), findMany: async () => [], count: async () => 0 },
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any, { get: () => reports } as any);
}

const A_LABEL = /Participant [A-Z]\b|the initiator/i;

describe('the check-in page, as each reader who is given the report whole', () => {
  it('Wairimu, the lead, reads the agreements and differences with names in, and never a stand-in label', async () => {
    const res: any = await serviceFor('MEMBER').get('g1', 'org1', 'userLead');
    const report = JSON.stringify(res.report);
    expect(report).not.toMatch(A_LABEL);
    expect(res.report.agreements).toEqual(['The price list has been sent by Fatuma Bello.']);
    expect(JSON.stringify(res.report.divergences)).toContain('Kevin Odhiambo');
    expect(JSON.stringify(res.report.divergences)).toContain('31 shops on the list');
  });

  it('Grace, an admin who only reads, reads the same with names in, and never a stand-in label', async () => {
    const res: any = await serviceFor('ADMIN').get('g1', 'org1', 'userGrace');
    expect(JSON.stringify(res.report)).not.toMatch(A_LABEL);
    expect(res.report.agreements).toEqual(['The price list has been sent by Fatuma Bello.']);
  });

  it('Kevin, a participant, is still not handed the raw lists at all', async () => {
    const res: any = await serviceFor('MEMBER').get('g1', 'org1', 'userKevin');
    expect(res.report.agreements).toBeUndefined();
    expect(res.report.divergences).toBeUndefined();
    expect(JSON.stringify(res.report)).not.toMatch(A_LABEL);
  });
});
