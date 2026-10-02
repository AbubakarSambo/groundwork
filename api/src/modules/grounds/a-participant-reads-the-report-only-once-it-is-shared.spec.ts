import { GroundsService } from './grounds.service';
import { ReportsService } from '../reports/reports.service';

/**
 * THE CHECK-IN'S OWN READ, AS A PARTICIPANT, BEFORE AND AFTER THE REPORT IS RELEASED (U.5 review).
 *
 * Found by the review: as a participant, GET /grounds/:id returned report.sharedPicture while
 * releasedAt was still null, the lead's whole account of the team ("... Miriam is responsible for
 * closing 4 sales ..."). A participant never reads the team's report before it is shared with them.
 * And where people are not named to each other, the session rows of hidden colleagues stay out too.
 */
/* As stored: in labels. What a reader gets must have names in, through the report's own door. */
const PICTURE = 'The initiator reports 18 sales. Participant B is responsible for closing 4 sales.';
const OPENING = 'The initiator’s plan counts on 4 sales from Participant A, but Participant A forecasts 2.';

function serviceFor(opts: { released: boolean; peersVisible: boolean | null; viewerRole?: string; sharedAs?: string; noDoor?: boolean; releasedSessions?: number[]; held?: number }) {
  const participants = [
    { id: 'pA', userId: 'userA', email: 'ada@example.test', partyType: 'PARTICIPANT', roleAsDescribed: null, user: { firstName: 'Ada', lastName: 'Lovelace' }, createdAt: new Date('2026-09-01') },
    { id: 'pB', userId: 'userB', email: 'blair@example.test', partyType: 'PARTICIPANT', roleAsDescribed: null, user: { firstName: 'Blair', lastName: 'Kane' }, createdAt: new Date('2026-09-02') },
    { id: 'pL', userId: 'userLead', email: 'lead@example.test', partyType: 'INITIATOR', roleAsDescribed: null, user: { firstName: 'Wairimu', lastName: 'Kamau' }, createdAt: new Date('2026-08-31') },
  ];
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: 'userLead', createdAt: new Date(), scenario: 'OKR_ALIGNMENT',
    peersVisibleToEachOther: opts.peersVisible, timelineDays: null, restrictExternalVisibility: true,
    participants,
    checkIns: [
      { id: 'cA', participantId: 'pA', sessionNumber: 1, status: 'COMPLETED' },
      { id: 'cB', participantId: 'pB', sessionNumber: 1, status: 'NOT_STARTED' },
    ],
    resolution: null, patternDetections: [],
    report: {
      id: 'r1', releasedAt: opts.released ? new Date() : null, sharedPicture: PICTURE, theOpening: OPENING, sharedAs: opts.sharedAs ?? null,
      createdAt: new Date(), agreements: [{ text: 'agreed thing' }], divergences: [{ text: 'a difference between Ada and Blair' }],
      ...(opts.releasedSessions ? { releasedSessions: opts.releasedSessions } : {}),
    },
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: opts.viewerRole ?? 'MEMBER', organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
    /* For the session progress the read works out while the report is not yet released. */
    checkIn: { aggregate: async () => ({ _max: { sessionNumber: opts.held ?? 1 } }), findMany: async () => [], count: async () => 0 },
  };
  /* The real report service, for its one naming door; nothing else of it is used. */
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  const moduleRef: any = opts.noDoor ? undefined : { get: () => reports };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any, moduleRef);
}

describe('the report on the check-in read, as a participant', () => {
  it('before it is released: none of its text, and no agreements or differences', async () => {
    const res: any = await serviceFor({ released: false, peersVisible: true }).get('g1', 'org1', 'userA');
    expect(res.report).toEqual({ id: 'r1', releasedAt: null, releasedSessions: [], createdAt: expect.any(Date) });
    expect(JSON.stringify(res)).not.toContain('responsible for closing');
    expect(JSON.stringify(res)).not.toContain('forecasts');
    expect(JSON.stringify(res)).not.toContain('a difference between');
  });

  it('once it is released: the shared picture and the opening, with names in, never a label or the raw differences', async () => {
    const res: any = await serviceFor({ released: true, peersVisible: true }).get('g1', 'org1', 'userA');
    for (const t of [res.report.sharedPicture, res.report.theOpening]) {
      expect(t).toBeTruthy();
      expect(t).not.toMatch(/Participant [A-Z]\b|the initiator/i);
    }
    expect(res.report.theOpening).toMatch(/Wairimu/);
    expect(res.report.divergences).toBeUndefined();
    expect(res.report.agreements).toBeUndefined();
  });

  it('where people are not named to each other, a colleague is never named, and never a label', async () => {
    const res: any = await serviceFor({ released: true, peersVisible: false }).get('g1', 'org1', 'userA');
    expect(res.report.sharedPicture).not.toMatch(/Blair|Participant [A-Z]\b/);
    /* Changed with decision 75, item 14: where people do not see each other, a sentence about one colleague is not
       served at all, where it used to be served about "a colleague". The lead's own sentence stays. */
    expect(res.report.sharedPicture).not.toMatch(/a colleague/i);
    expect(res.report.sharedPicture).toBe('Wairimu Kamau reports 18 sales.');
  });

  it('shared without names, nobody is named and no label shows', async () => {
    const res: any = await serviceFor({ released: true, peersVisible: true, sharedAs: 'ANONYMOUS' }).get('g1', 'org1', 'userA');
    expect(res.report.theOpening).not.toMatch(/Wairimu|Blair|Participant [A-Z]\b|the initiator/i);
  });

  it('fails closed: with no way to put names in, no report text is served at all', async () => {
    const res: any = await serviceFor({ released: true, peersVisible: true, noDoor: true }).get('g1', 'org1', 'userA');
    expect(res.report.sharedPicture).toBeNull();
    expect(res.report.theOpening).toBeNull();
  });

  it('the lead who runs it still reads the report before it is released', async () => {
    const res: any = await serviceFor({ released: false, peersVisible: true }).get('g1', 'org1', 'userLead');
    expect(res.report.sharedPicture).toMatch(/Blair/);
    expect(res.report.sharedPicture).not.toMatch(/Participant [A-Z]\b/);
  });

  it('and so does an admin of the organisation', async () => {
    const res: any = await serviceFor({ released: false, peersVisible: true, viewerRole: 'ADMIN' }).get('g1', 'org1', 'userAdmin');
    expect(res.report.sharedPicture).toMatch(/Blair/);
  });
});

describe('decision 76, item 4: the stored picture is the session the report holds now, released on its own', () => {
  it('a participant reads none of it while session 2 is not released, though session 1 is', async () => {
    const res: any = await serviceFor({ released: true, peersVisible: true, releasedSessions: [1], held: 2 }).get('g1', 'org1', 'userA');
    expect(res.report).toEqual({ id: 'r1', releasedAt: expect.any(Date), releasedSessions: [1], createdAt: expect.any(Date) });
    expect(JSON.stringify(res)).not.toContain('responsible for closing');
    expect(JSON.stringify(res)).not.toContain('forecasts');
  });

  it('and reads it once session 2 is released', async () => {
    const res: any = await serviceFor({ released: true, peersVisible: true, releasedSessions: [1, 2], held: 2 }).get('g1', 'org1', 'userA');
    expect(res.report.releasedSessions).toEqual([1, 2]);
    expect(res.report.sharedPicture).toMatch(/Blair Kane is responsible for closing 4 sales/);
  });

  it('the lead and an admin read it either way', async () => {
    for (const [user, role] of [['userLead', 'MEMBER'], ['userAdmin', 'ADMIN']]) {
      const res: any = await serviceFor({ released: true, peersVisible: true, releasedSessions: [1], held: 2, viewerRole: role }).get('g1', 'org1', user);
      expect(res.report.sharedPicture).toMatch(/Blair/);
    }
  });
});

describe('the session rows on the check-in read, where people are not named to each other', () => {
  it('a participant gets only their own', async () => {
    const res: any = await serviceFor({ released: false, peersVisible: false }).get('g1', 'org1', 'userA');
    expect(res.peersVisibleEffective).toBe(false);
    expect(res.participants.map((p: any) => p.id)).toEqual(['pA']);
    expect(res.checkIns.map((c: any) => c.id)).toEqual(['cA']);
  });

  it('the lead still sees everyone', async () => {
    const res: any = await serviceFor({ released: false, peersVisible: false }).get('g1', 'org1', 'userLead');
    expect(res.checkIns.map((c: any) => c.id)).toEqual(['cA', 'cB']);
  });
});
