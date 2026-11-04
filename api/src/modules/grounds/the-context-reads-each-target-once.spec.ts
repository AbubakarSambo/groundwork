import { GroundsService } from './grounds.service';
import { PartyType } from '@prisma/client';
import { theNumbersSaid, isATargetSaidAgain } from './the-context-reads-each-target-once';
import { eachTargetOnce, theyNameTheSameWork } from '../board/a-target-said-again-is-that-target';

/**
 * THE CONTEXT TAB READS EACH TARGET ONCE, AS EACH READER IS SERVED IT (Hafsah, 18 October 2026; Drop Access and Muchemi & Co).
 *
 * The record is Drop Access's on gw_sweep_drop10: Grace runs it, the team aims at 120 units by 30 October and each rep at 40,
 * Mercy's 30 for Tuskys Westgate is on record, and Kevin, Joseph and Mercy each said a target on record again as what they are
 * expected to do. Read through GET /grounds/:id, which is what the Context tab draws.
 */
const GRACE = 'u-grace'; const KEVIN = 'u-kevin'; const MERCY = 'u-mercy'; const JOSEPH = 'u-joseph';
const person = (id: string, userId: string, first: string, type: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, email: `${first.toLowerCase()}@dropaccess.test`, partyType: type, roleAsDescribed: null, nameGiven: null, organisationGiven: null,
  managingOnly: false, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-10-12'),
  user: { firstName: first, lastName: 'Test' },
});
const people = () => [person('p-grace', GRACE, 'Grace', PartyType.INITIATOR), person('p-kevin', KEVIN, 'Kevin'), person('p-mercy', MERCY, 'Mercy'), person('p-joseph', JOSEPH, 'Joseph')];
const target = (id: string, name: string, n: number | null, owner: string | null, sortOrder: number) => ({ id, name, target: n, ownerParticipantId: owner, sortOrder, assumes: [], isADecisionAboutAPerson: false });
const DROP_TARGETS = () => [
  target('o-team', 'Units sold by 30 October', 120, null, 0),
  target('o-kevin', 'units sold by 30 October', 40, 'p-kevin', 1),
  target('o-mercy', 'units sold by 30 October', 40, 'p-mercy', 2),
  target('o-joseph', 'units sold by 30 October', 40, 'p-joseph', 3),
  target('o-leads', 'New leads this week', 30, null, 4),
  target('o-tuskys', "The 30 units for Tuskys Westgate stands as what we're aiming for.", 30, 'p-mercy', 5),
  /* Said again, as a target, the way the old writer kept them (Hafsah's point 9). */
  target('o-120-again', 'The team is aiming to sell 120 water dispensers', 120, null, 6),
  target('o-mercy-40-again', 'Sell 40 units', 40, 'p-mercy', 7),
];
const expectation = (id: string, participantId: string, text: string, kind: string) => ({
  id, participantId, text, kind, authoredBy: 'self', seenBySubject: true, updatedAt: new Date('2026-10-15'), createdAt: new Date('2026-10-15'),
  trackedUrl: null, lastSeenState: null, lastSeenAt: null, awareness: null, awarenessDetail: null, objection: null, objectionAt: null,
  alignment: null, alignmentNote: null, check: null, dueKind: null, dueSaid: null, owedToParticipantId: null, dueDate: null, status: 'OPEN',
});
const DROP_EXPECTATIONS = () => [
  expectation('e-kevin-120', 'p-kevin', 'The target is still 120 units by October 30th.', 'TARGET'),
  expectation('e-kevin-more', 'p-kevin', 'My aim is to sell more units.', 'GOAL'),
  expectation('e-kevin-jane', 'p-kevin', "I'll follow up with Jane at Savannah Cafe about her final payment by the end of the month.", 'TODO'),
  expectation('e-mercy-30', 'p-mercy', "I'm still aiming for 30 units with Tuskys Westgate.", 'TARGET'),
  expectation('e-mercy-rose', 'p-mercy', "I'll remind Accounts about Rose's deposit for Mama Mboga Mart.", 'TODO'),
  expectation('e-mercy-quote', 'p-mercy', "I'll send Peter the quote for 30 units", 'TODO'),
  expectation('e-joseph-40', 'p-joseph', 'My main aim is still the 40 units Grace expects.', 'TARGET'),
  expectation('e-joseph-40b', 'p-joseph', 'My goal is the 40 units Grace expects.', 'COMMITMENT'),
];

function contextFor(userId: string, o: { releaseOne: boolean; kindOfWork?: string; targets?: any[]; expectations?: any[]; whoSeesTargets?: string } = { releaseOne: true }) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: GRACE, createdAt: new Date(), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: o.whoSeesTargets ?? 'THEIR_OWN', kindOfWork: o.kindOfWork ?? 'sales team',
    participants: people(), checkIns: [], resolution: null, patternDetections: [], objectives: o.targets ?? DROP_TARGETS(),
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: null, createdAt: new Date() },
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => o.expectations ?? DROP_EXPECTATIONS()) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: userId === GRACE ? 'ADMIN' : 'MEMBER', organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'GROWTH', subscriptionStatus: 'active', freeExtensionUsed: false, release1SalesBoardOn: o.releaseOne }) },
    leadContextNote: { findMany: async () => [] },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any).get('g1', 'org1', userId) as Promise<any>;
}
const targetsRead = (g: any) => (g.objectives ?? []).map((t: any) => `${t.target} ${t.name}`);
const expectedOf = (g: any, pid: string) => ((g.participants ?? []).find((p: any) => p.id === pid)?.objective?.all ?? []).map((e: any) => e.text);

describe('the Context tab reads each target once (Release 1 on, a sales check-in)', () => {
  it('Grace, who runs it, reads the team\'s 120, each rep\'s 40 and the Tuskys Westgate 30 once each, and no restatement', async () => {
    const g = await contextFor(GRACE);
    expect(targetsRead(g)).toEqual([
      '120 Units sold by 30 October',
      '40 units sold by 30 October',
      '40 units sold by 30 October',
      '40 units sold by 30 October',
      '30 New leads this week',
      "30 The 30 units for Tuskys Westgate stands as what we're aiming for.",
    ]);
    expect(JSON.stringify(g.objectives)).not.toContain('120 water dispensers');
    expect(JSON.stringify(g.objectives)).not.toContain('Sell 40 units');
  });
  it('under each person, Grace reads what they are expected to do without the targets said again', async () => {
    const g = await contextFor(GRACE);
    expect(expectedOf(g, 'p-kevin')).toEqual(['My aim is to sell more units.', "I'll follow up with Jane at Savannah Cafe about her final payment by the end of the month."]);
    expect(expectedOf(g, 'p-joseph')).toEqual([]);
    expect(expectedOf(g, 'p-mercy')).toEqual(["I'll remind Accounts about Rose's deposit for Mama Mboga Mart.", "I'll send Peter the quote for 30 units"]);
    expect(JSON.stringify(g)).not.toContain('The target is still 120 units');
    expect(JSON.stringify(g)).not.toContain('40 units Grace expects');
  });
  it('Mercy reads the team\'s targets, then her own 40 and 30 once each, and never a colleague\'s share', async () => {
    const g = await contextFor(MERCY);
    expect(targetsRead(g)).toEqual([
      '120 Units sold by 30 October',
      '30 New leads this week',
      '40 units sold by 30 October',
      "30 The 30 units for Tuskys Westgate stands as what we're aiming for.",
    ]);
    expect(g.objectives.every((t: any) => !t.ownerParticipantId || t.ownerParticipantId === 'p-mercy')).toBe(true);
    expect(expectedOf(g, 'p-mercy')).not.toContain("I'm still aiming for 30 units with Tuskys Westgate.");
  });
  it('Kevin reads the team\'s 120 once and his own 40', async () => {
    const g = await contextFor(KEVIN);
    expect(targetsRead(g)).toEqual(['120 Units sold by 30 October', '30 New leads this week', '40 units sold by 30 October']);
  });
});

describe('with Release 1\'s sales board off, a sales check-in\'s Context reads as it did', () => {
  it('Grace reads every row on record', async () => {
    const g = await contextFor(GRACE, { releaseOne: false });
    expect(g.objectives).toHaveLength(8);
    expect(expectedOf(g, 'p-joseph')).toEqual(['My main aim is still the 40 units Grace expects.', 'My goal is the 40 units Grace expects.']);
  });
});

describe('Muchemi & Co, a litigation team: the Kamau filing is listed once', () => {
  const KAMAU = [
    target('o-k1', 'The team files and stamps the Kamau v. Apex defence', null, null, 0),
    target('o-k2', 'The team is aiming to file the statement of defence for Kamau v. Apex Ltd', null, null, 1),
    target('o-k3', "The team is aiming to draft a reply to the plaintiff's letter in Kamau v. Apex Ltd", null, null, 2),
  ];
  it('the lead reads the filing once and the reply to the letter as its own aim, whatever the Release 1 switch says', async () => {
    for (const releaseOne of [true, false]) {
      const g = await contextFor(GRACE, { releaseOne, kindOfWork: 'litigation', targets: KAMAU, expectations: [] });
      expect(g.objectives.map((t: any) => t.name)).toEqual([
        'The team files and stamps the Kamau v. Apex defence',
        "The team is aiming to draft a reply to the plaintiff's letter in Kamau v. Apex Ltd",
      ]);
    }
  });
});

describe('the rule underneath', () => {
  it('the day of a date is not a number said', () => {
    expect(theNumbersSaid('The target is still 120 units by October 30th.')).toEqual([120]);
    expect(theNumbersSaid('Sell 40 units by 30 October')).toEqual([40]);
  });
  it('an expectation the lead set for somebody is the lead\'s, and stays', () => {
    expect(isATargetSaidAgain({ text: 'My goal is the 40 units Grace expects.', kind: 'GOAL', participantId: 'p-joseph', authoredBy: 'lead' }, DROP_TARGETS())).toBe(false);
    expect(isATargetSaidAgain({ text: 'My goal is the 40 units Grace expects.', kind: 'GOAL', participantId: 'p-joseph', authoredBy: 'self' }, DROP_TARGETS())).toBe(true);
  });
  it('a to-do that names a number is not a target said again', () => {
    expect(isATargetSaidAgain({ text: 'Deliver 40 units on Friday', kind: 'TODO', participantId: 'p-kevin' }, DROP_TARGETS())).toBe(false);
  });
  it('another person\'s share is never what somebody says again', () => {
    expect(isATargetSaidAgain({ text: 'My target is 30 units at Tuskys Westgate', kind: 'TARGET', participantId: 'p-kevin' }, DROP_TARGETS())).toBe(false);
  });
  it('two aims with no number name the same work only when most of their words do', () => {
    expect(theyNameTheSameWork('The team files and stamps the Kamau v. Apex defence', 'The team is aiming to file the statement of defence for Kamau v. Apex Ltd')).toBe(true);
    expect(theyNameTheSameWork('The team is aiming to file the statement of defence for Kamau v. Apex Ltd', "Draft a reply to the plaintiff's letter in Kamau v. Apex Ltd")).toBe(false);
    expect(eachTargetOnce([{ name: 'Call ten shops', target: null }, { name: 'Visit ten shops', target: null }])).toHaveLength(2);
  });
});
