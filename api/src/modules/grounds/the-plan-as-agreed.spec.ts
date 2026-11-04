import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';
import { thePlanAsAgreed, theCadenceIn } from './the-plan-as-agreed';

/**
 * THE PLAN, AS AGREED, AS EACH READER IS SERVED IT (Hafsah, 18 October 2026; the prototype's full Context page). Drop Access's
 * record: the team aims for each rep to open 10 new leads each week, Kevin carries his own 12 new leads a week (his own 10 would be the team's said again, and read once), and each rep's 40
 * units by 30 October has no cadence. Grace confirmed a plan card that made Mercy's commitment to call Tuskys every Monday.
 */
const person = (id: string, userId: string, first: string, type: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, email: `${first.toLowerCase()}@dropaccess.test`, partyType: type, roleAsDescribed: null, nameGiven: null, organisationGiven: null,
  managingOnly: false, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-10-12'),
  user: { firstName: first, lastName: 'Test' },
});
const target = (id: string, name: string, n: number | null, owner: string | null, sortOrder: number) => ({ id, name, target: n, ownerParticipantId: owner, sortOrder, assumes: [], isADecisionAboutAPerson: false });

function contextFor(userId: string, opts: { confirmed?: string[]; switchOff?: boolean } = {}) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: 'u-grace', createdAt: new Date(), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'THEIR_OWN', kindOfWork: 'sales team',
    participants: [person('p-grace', 'u-grace', 'Grace', PartyType.INITIATOR), person('p-kevin', 'u-kevin', 'Kevin'), person('p-mercy', 'u-mercy', 'Mercy')],
    checkIns: [], resolution: null, patternDetections: [],
    objectives: [
      target('o-team', 'Units sold by 30 October', 120, null, 0),
      target('o-kevin', 'units sold by 30 October', 40, 'p-kevin', 1),
      target('o-each', 'The team is aiming for each rep to open 10 new leads each week', 10, null, 2),
      target('o-kevin-leads', 'new leads a week', 12, 'p-kevin', 3),
    ],
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: null, createdAt: new Date() },
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: userId === 'u-grace' ? 'ADMIN' : 'MEMBER', organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'GROWTH', subscriptionStatus: 'active', release1SalesBoardOn: !opts.switchOff }) },
    leadContextNote: { findMany: async () => [] },
    groundCommitment: { findMany: async () => [{ id: 'k-tuskys', participantId: 'p-mercy', text: 'call Peter at Tuskys Westgate every Monday', whenSaid: null, explicit: false, status: 'UNKNOWN', settledAt: null }] },
    planProposal: { findMany: async () => (opts.confirmed ?? []).map((becameId) => ({ becameId })) },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any).get('g1', 'org1', userId) as Promise<any>;
}
const lines = (g: any) => (g.planAsAgreed ?? []).map((l: any) => `${l.what} | ${l.who}, ${l.when}`);

describe('the plan, as agreed, on the Context tab', () => {
  it('Grace reads the lines the record holds: Kevin\'s 12 new leads a week, everyone\'s weekly leads, and the card she confirmed', async () => {
    expect(lines(await contextFor('u-grace', { confirmed: ['k-tuskys'] }))).toEqual([
      'Each rep to open 10 new leads each week | Everyone, Weekly',
      '12 new leads a week | Kevin, Weekly',
      'Call Peter at Tuskys Westgate every Monday | Mercy, Ongoing',
    ]);
  });
  it('Kevin reads his own line as his, and never another rep\'s target', async () => {
    const got = lines(await contextFor('u-kevin', { confirmed: ['k-tuskys'] }));
    expect(got).toContain('12 new leads a week | You, Weekly');
    expect(got.join('\n')).not.toMatch(/Mercy.*\d/);
  });
  it('Mercy never reads Kevin\'s own number', async () => {
    const got = lines(await contextFor('u-mercy'));
    expect(got.join('\n')).not.toContain('Kevin');
    expect(got).toEqual(['Each rep to open 10 new leads each week | Everyone, Weekly']);
  });
  /* Release 1, part 3: the plan, as agreed, is behind Release 1's switch; off, the Context tab reads as it did. */
  it('with Release 1\'s switch off, nobody reads a plan, as agreed', async () => {
    for (const u of ['u-grace', 'u-kevin', 'u-mercy']) expect((await contextFor(u, { confirmed: ['k-tuskys'], switchOff: true })).planAsAgreed).toBeUndefined();
  });
  it('a target with a date and no cadence is not the plan, and nothing is invented', () => {
    expect(thePlanAsAgreed({ targets: [{ id: 'x', name: 'units sold by 30 October', target: 40, ownerParticipantId: 'p-kevin' }], commitments: [], confirmed: new Set(), nameOf: () => 'Kevin', meId: null })).toEqual([]);
    expect(theCadenceIn('10 new leads a week')).toBe('Weekly');
    expect(theCadenceIn('units sold by 30 October')).toBeNull();
  });
});
