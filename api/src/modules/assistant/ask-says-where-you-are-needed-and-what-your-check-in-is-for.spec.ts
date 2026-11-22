import { PartyType } from '@prisma/client';
import { askGroundwork, textOf } from './request-92-harness';
import { BoardService } from '../board/board.service';
import { boardAs, person, answered, type Setup } from '../board/the-switchboards-sections-harness';
import { theWaitsOnCustomersApart } from '../board/a-customers-reply-is-on-its-deal';

/**
 * TWO ASK ANSWERS FROM THE EVENING RE-TEST OF 22 NOVEMBER, BY CAUSE.
 *
 * Bug 26: Amani asked "where am I needed?" and read that the record was quiet. She was waiting on Baraka, who works at Msingi Foods
 * but is not in her check-in, for the Mama Njeri delivery date. The deal "Mama Njeri Duka" was kept with Baraka as its contact, so the
 * wait was read as a customer's, put on the deal and left out of every list of waits Ask reads (gw_sweep_final, read 22 November).
 *
 * Bug 28: Amani asked "what is my check-in for?" and read its description, without the waitlist goal her lead had set. The answer now
 * names the team's goals as her own board serves them.
 */

/* ---------------------------------------------------------------- bug 26 */

const AMANI_WAITS = {
  id: 'd-1', groundId: 'g', fromParticipantId: 'p-amani', onParticipantId: null, onLabel: 'Baraka', what: 'the Mama Njeri delivery date',
  status: 'WAITING', sourceCheckInId: 'c-amani-2', createdAt: new Date('2026-11-22T14:06:53Z'), escalatedAt: null, triedSaid: null, takenFurther: null,
  ground: { label: 'Sales team, Q4', scenario: 'OKR_ALIGNMENT', initiatorId: 'u-wairimu', peersVisibleToEachOther: true, participants: [
    { id: 'p-wairimu', userId: 'u-wairimu', email: 'wairimu@msingi.test', partyType: 'INITIATOR', managingOnly: false, createdAt: new Date('2026-11-01') },
    { id: 'p-amani', userId: 'u-amani', email: 'amani@msingi.test', partyType: 'PARTICIPANT', managingOnly: false, createdAt: new Date('2026-11-01') },
  ] },
  fromParticipant: { email: 'amani@msingi.test', userId: 'u-amani', partyType: 'PARTICIPANT', nameGiven: null, organisationGiven: null, user: { firstName: 'Amani', lastName: 'Wekesa' } },
  onParticipant: null,
};
/* The deal as the record kept it: Baraka, a colleague, written as its contact. */
const THE_DEAL = { id: 'w-1', groundId: 'g', name: 'Mama Njeri Duka', ownerParticipantId: 'p-amani', fields: { Units: '20 cartons', Contact: 'Baraka', 'Next step': 'waiting on Baraka for the delivery date' } };
const ROSTER = [
  { externalId: 'amani', displayName: 'Amani Wekesa', givenName: null, familyName: null, email: 'amani@msingi.test' },
  { externalId: 'baraka', displayName: 'Baraka Mutua', givenName: null, familyName: null, email: 'baraka@msingi.test' },
  { externalId: 'wairimu', displayName: 'Wairimu Njoroge', givenName: null, familyName: null, email: 'wairimu@msingi.test' },
];

function theRecord(): any {
  return {
    groundDependency: { findMany: jest.fn(async () => [structuredClone(AMANI_WAITS)]) },
    workItem: { findMany: jest.fn(async () => [structuredClone(THE_DEAL)]) },
    person: { findMany: jest.fn(async ({ where }: any) => ROSTER.filter((p) => !where?.email?.in || where.email.in.includes(p.email))) },
    ground: { findMany: jest.fn(async () => [{ organizationId: 'org-a' }]) },
    organization: { findUnique: jest.fn(async () => ({ release1SalesBoardOn: true })) },
    conversationTurn: { findMany: jest.fn(async () => [{ checkInId: 'c-amani-2', content: 'I am waiting on Baraka for the Mama Njeri delivery date.', checkIn: { participantId: 'p-amani' } }]) },
  };
}

describe('bug 26: "where am I needed?", as Amani reads it', () => {
  it('her wait on Baraka, a colleague, is said, and never left out as a customer’s', async () => {
    const record = theRecord();
    const board = Object.create(BoardService.prototype) as BoardService;
    (board as any).prisma = record;
    const h = askGroundwork({ userId: 'u-amani', role: 'MEMBER', participants: [{ groundId: 'g', partyType: 'PARTICIPANT' }] });
    h.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: 'amani', displayName: 'Amani Wekesa', active: true, linkedUserId: 'u-amani', email: 'amani@msingi.test' }));
    (h.service as any).board = {
      waitingAcrossTheOrg: (...a: any[]) => (board as any).waitingAcrossTheOrg(...a),
      whoNeedsYouThisWeek: async () => ({ buckets: [], whatThisIsNot: [] }),
    };
    (h.service as any).truth = { forPerson: async () => ({ person: { externalId: 'amani' }, sessions: { value: [] } }) };
    const r: any = await h.service.respond('org-a', 'p1', 'where am I needed?');
    const t = textOf(r);
    expect(r.lane).toBe('where_am_i_needed');
    expect(t).not.toMatch(/Nothing in the record needs you/);
    expect(t).toContain('Baraka');
    expect(t).toContain('the Mama Njeri delivery date');
  });

  it('the same rule places waits for the board: a colleague stays the team’s, the deal’s real customer stays on the deal', () => {
    /* Baraka is still kept as the Mama Njeri deal's contact; Njeri is the contact of another deal of hers, and is nobody at Msingi Foods. */
    const onTheCustomer = { ...AMANI_WAITS, id: 'd-2', onLabel: 'Njeri', what: 'a reply about the next order' };
    const another = { id: 'w-2', groundId: 'g', name: 'Kilele Shop', ownerParticipantId: 'p-amani', fields: { Contact: 'Njeri' } };
    const apart = theWaitsOnCustomersApart([AMANI_WAITS, onTheCustomer] as any[], [THE_DEAL, another], new Map(), ROSTER.map((p) => p.displayName));
    expect(apart.team.map((w: any) => w.what)).toEqual(['the Mama Njeri delivery date']);
    expect(apart.onDeals.map((w: any) => w.what)).toEqual(['a reply about the next order']);
  });
});

/* ---------------------------------------------------------------- bug 28 */

const SALES: Setup = {
  people: [
    person('p-wairimu', 'u-wairimu', 'Wairimu', 'Njoroge', PartyType.INITIATOR),
    person('p-amani', 'u-amani', 'Amani', 'Wekesa'),
    person('p-chidi', 'u-chidi', 'Chidi', 'Okeke'),
  ],
  initiatorId: 'u-wairimu',
  label: 'Sales team, Q4',
  checkIns: [answered('p-amani', 1), answered('p-chidi', 1)],
  objectives: [
    { id: 'o-team', groundId: 'g-1', name: 'Each person on the sales team builds a waitlist of 15 shops by 31 December', target: 15, count: 2, prevCount: 0, ownerParticipantId: null, setByParticipantId: 'p-wairimu', sortOrder: 0, addedAtSession: null },
    { id: 'o-chidi', groundId: 'g-1', name: 'Chidi signs 5 new shops', target: 5, count: 1, prevCount: 0, ownerParticipantId: 'p-chidi', setByParticipantId: 'p-wairimu', sortOrder: 1, addedAtSession: null },
  ],
};
const THE_CHECK_IN = {
  id: 'g-1', label: 'Sales team, Q4', initiatorId: 'u-wairimu', brief: 'Get the Q4 numbers in.', toldToParticipants: 'We track new shops, payments and visits each week.',
  scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, organization: { name: 'Msingi Foods' }, initiator: { firstName: 'Wairimu' },
};

async function whatItIsForAs(userId: string, firstName: string) {
  const h = askGroundwork({ userId, role: 'MEMBER', participants: [{ groundId: 'g-1', partyType: userId === 'u-wairimu' ? 'INITIATOR' : 'PARTICIPANT' }] });
  h.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: userId, displayName: firstName, active: true, linkedUserId: userId }));
  h.prisma.ground.findMany = jest.fn(async () => [THE_CHECK_IN]);
  /* Nobody here waits for a seat. */
  h.prisma.groundParticipant.findMany = jest.fn(async ({ where }: any = {}) => (where?.awaitingSeat ? [] : [{ groundId: 'g-1', partyType: userId === 'u-wairimu' ? 'INITIATOR' : 'PARTICIPANT' }]));
  h.prisma.user = { ...(h.prisma.user ?? {}), findUnique: jest.fn(async () => ({ firstName, role: 'MEMBER', organizationId: 'org-a' })) };
  (h.service as any).board = { get: (_g: string, uid: string) => boardAs(SALES, uid, 'MEMBER') };
  (h.service as any).truth = { forPerson: async () => ({ person: { externalId: userId }, sessions: { value: [] } }) };
  return textOf(await h.service.respond('org-a', 'p1', 'What is my check-in for, and who reads it?'));
}

describe('bug 28: "what is my check-in for?", as each reader reads it', () => {
  it('Amani reads its purpose and the team’s goal now, as her board shows it, and nobody’s own goal', async () => {
    const t = await whatItIsForAs('u-amani', 'Amani');
    expect(t).toContain('This is what "Sales team, Q4" is for. We track new shops, payments and visits each week.');
    expect(t).toContain('The team’s goal now, as your board shows it, is this. Each person on the sales team builds a waitlist of 15 shops by 31 December.');
    expect(t).not.toContain('Chidi signs');
  });

  it('Wairimu, who runs it, reads her own brief and the same team goal', async () => {
    const t = await whatItIsForAs('u-wairimu', 'Wairimu');
    expect(t).toContain('This is what "Sales team, Q4" is for. Get the Q4 numbers in.');
    expect(t).toContain('Each person on the sales team builds a waitlist of 15 shops by 31 December.');
  });
});
